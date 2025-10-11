'use client';

import type { SCAINResult, Utterance } from '@atlas/core';
import { extractNouns } from '@atlas/core';
import { useCallback, useEffect, useState } from 'react';
import type { ContextRecoveryData } from '@/features/context-recovery';
import { ContextRecoveryPanel, QuickActionButtons } from '@/features/context-recovery';
import type { SmartNotificationData } from '@/features/notifications';
import { SmartNotification } from '@/features/notifications';
import { TopicHistoryPanel } from '@/features/topic-tracking';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { getSpeakerName, setSpeakerName } from '../utils/speaker-storage';
import { ControlPanel } from './ControlPanel';
import { ConversationView } from './ConversationView';
import { SpeakerNameModal } from './SpeakerNameModal';

// 通知履歴を保持（話題転換検出用）
let lastTopicKeywords: string[] = [];

export function ConversationAssistant() {
  const [dialogue, setDialogue] = useState<Utterance[]>([]);
  const [scainResults, setSCAINResults] = useState<Map<number, SCAINResult>>(new Map());
  const [notifications, setNotifications] = useState<SmartNotificationData[]>([]);
  const [contextRecovery, setContextRecovery] = useState<ContextRecoveryData | null>(null);
  const [showTopicHistory, setShowTopicHistory] = useState(false);
  const [importantOnlyMode, setImportantOnlyMode] = useState(false);
  const [speakerName, setSpeakerNameState] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);

  // 初回マウント時に話者名を取得
  useEffect(() => {
    const savedName = getSpeakerName();
    if (savedName) {
      setSpeakerNameState(savedName);
    } else {
      setShowNameModal(true);
    }
  }, []);

  const handleSpeakerNameSubmit = (name: string) => {
    setSpeakerName(name);
    setSpeakerNameState(name);
    setShowNameModal(false);
  };

  const addNotification = useCallback((notification: SmartNotificationData) => {
    setNotifications(prev => [...prev, notification]);

    // 自動削除（15秒後）
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 15000);
  }, []);

  const detectSCAIN = useCallback(
    async (dialogue: Utterance[], current: Utterance) => {
      try {
        const response = await fetch('/api/detect-dependency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dialogue, current }),
        });

        if (!response.ok) {
          throw new Error('SCAIN判定APIエラー');
        }

        const result: SCAINResult = await response.json();

        if (result.is_scain) {
          setSCAINResults(prev => new Map(prev).set(current.id, result));

          // 通知ロジック
          const reasons: SmartNotificationData['reasons'] = [];
          let level: SmartNotificationData['level'] = 'medium';

          // 話題転換の検出
          const currentNouns = extractNouns(current.text);
          if (lastTopicKeywords.length > 0) {
            const overlap = currentNouns.filter(n => lastTopicKeywords.includes(n));
            const similarity =
              overlap.length / Math.max(currentNouns.length, lastTopicKeywords.length, 1);

            if (similarity < 0.3 && currentNouns.length > 0) {
              reasons.push({
                type: 'topic_shift',
                message: '話題が変わりました',
              });
              level = 'medium';
            }
          }
          lastTopicKeywords = currentNouns;

          // 高依存度
          if (result.max_dependency_weight > 0.7) {
            reasons.push({
              type: 'high_dependency',
              message: `強い依存関係 (重み: ${Math.round(result.max_dependency_weight * 100)}%)`,
            });
            level = 'high';
          }

          // 重要度が高ければ通知
          if (result.importance_score > 0.65 || reasons.length > 0) {
            addNotification({
              id: Date.now(),
              level: result.importance_score > 0.8 ? 'critical' : level,
              title:
                result.importance_score > 0.8 ? '⚠️ 非常に重要な発言' : '重要な発言が検出されました',
              utterance: current,
              result,
              reasons,
              timestamp: Date.now(),
            });
          }
        }
      } catch (error) {
        console.error('SCAIN判定エラー:', error);
      }
    },
    [addNotification]
  );

  // Speech Recognition Hook
  const handleTranscript = useCallback(
    (transcript: string, isFinal: boolean) => {
      if (isFinal && speakerName) {
        const newUtterance: Utterance = {
          id: dialogue.length,
          speaker: speakerName,
          text: transcript,
          timestamp: Date.now(),
        };

        // 会話履歴に追加
        const updatedDialogue = [...dialogue, newUtterance];
        setDialogue(updatedDialogue);

        // SCAIN判定 (非同期)
        detectSCAIN(updatedDialogue, newUtterance);
      }
    },
    [dialogue, detectSCAIN, speakerName]
  );

  const { isListening, startListening, stopListening } = useSpeechRecognition({
    onTranscript: handleTranscript,
    onError: error => {
      console.error('音声認識エラー:', error);
    },
  });

  const dismissNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearConversation = () => {
    setDialogue([]);
    setSCAINResults(new Map());
    setNotifications([]);
    lastTopicKeywords = [];
  };

  const showContextForUtterance = useCallback(
    (utterance: Utterance) => {
      const result = scainResults.get(utterance.id);
      if (!result || !result.is_scain) {
        // 依存関係なし
        setContextRecovery({
          targetUtterance: utterance,
          dependencies: [],
        });
        return;
      }

      // 依存先の発言を取得
      const deps = result.dependencies
        .map(dep => {
          const refUtterance = dialogue.find(u => u.id === dep.id);
          if (!refUtterance) return null;
          return {
            dependency: dep,
            utterance: refUtterance,
          };
        })
        .filter(
          (d): d is { dependency: (typeof result.dependencies)[0]; utterance: Utterance } =>
            d !== null
        );

      setContextRecovery({
        targetUtterance: utterance,
        dependencies: deps,
      });
    },
    [dialogue, scainResults]
  );

  const showCurrentContext = useCallback(() => {
    if (dialogue.length === 0) return;
    const latest = dialogue[dialogue.length - 1];
    showContextForUtterance(latest);
  }, [dialogue, showContextForUtterance]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Speaker Name Modal */}
      <SpeakerNameModal isOpen={showNameModal} onSubmit={handleSpeakerNameSubmit} />

      {/* ヘッダー */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">ATLAS</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Attention Temporal Link Analysis System
        </p>
        {speakerName && (
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
            話者: <span className="font-semibold">{speakerName}</span>
          </p>
        )}
      </header>

      {/* 通知エリア */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notif => (
          <SmartNotification
            key={notif.id}
            notification={notif}
            onDismiss={() => dismissNotification(notif.id)}
            onShowContext={() => showContextForUtterance(notif.utterance)}
          />
        ))}
      </div>

      {/* Context Recovery パネル */}
      {contextRecovery && (
        <ContextRecoveryPanel data={contextRecovery} onClose={() => setContextRecovery(null)} />
      )}

      {/* Topic History パネル */}
      {showTopicHistory && (
        <TopicHistoryPanel dialogue={dialogue} onClose={() => setShowTopicHistory(false)} />
      )}

      {/* Quick Action Buttons */}
      <QuickActionButtons
        onShowCurrentContext={showCurrentContext}
        onShowImportantOnly={() => setImportantOnlyMode(prev => !prev)}
        onShowTopicHistory={() => setShowTopicHistory(true)}
        isImportantOnlyMode={importantOnlyMode}
        disabled={dialogue.length === 0}
      />

      {/* コントロールパネル */}
      <ControlPanel
        isListening={isListening}
        onStart={startListening}
        onStop={stopListening}
        onClear={clearConversation}
        utteranceCount={dialogue.length}
      />

      {/* 会話表示 */}
      <ConversationView
        dialogue={dialogue}
        scainResults={scainResults}
        onUtteranceClick={showContextForUtterance}
        importantOnlyMode={importantOnlyMode}
      />
    </div>
  );
}
