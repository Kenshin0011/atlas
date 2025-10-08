'use client';

import type { SCAINResult, Utterance } from '@atlas/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  SpeechRecognition,
  SpeechRecognitionErrorEvent,
  SpeechRecognitionEvent,
} from '@/types/speech';
import { ControlPanel } from './ControlPanel';
import { ConversationView } from './ConversationView';
import { NotificationPanel } from './NotificationPanel';

type Notification = {
  id: number;
  level: 'high' | 'medium' | 'low';
  message: string;
  utterance: Utterance;
  result: SCAINResult;
};

export function ConversationAssistant() {
  const [dialogue, setDialogue] = useState<Utterance[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [scainResults, setSCAINResults] = useState<Map<number, SCAINResult>>(new Map());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [...prev, notification]);

    // 自動削除（10秒後）
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 10000);
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

          // 重要度が高ければ通知
          if (result.importance_score > 0.7) {
            addNotification({
              id: Date.now(),
              level: 'high',
              message: '重要な発言が検出されました',
              utterance: current,
              result,
            });
          }
        }
      } catch (error) {
        console.error('SCAIN判定エラー:', error);
      }
    },
    [addNotification]
  );

  useEffect(() => {
    // Web Speech API の初期化
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognitionAPI) {
        alert('お使いのブラウザは音声認識に対応していません。Chromeをご利用ください。');
        return;
      }

      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ja-JP';
      recognition.maxAlternatives = 1;

      recognition.onresult = async (event: SpeechRecognitionEvent) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript;
        const isFinal = event.results[last].isFinal;

        if (isFinal) {
          const newUtterance: Utterance = {
            id: dialogue.length,
            speaker: '話者A', // TODO: 話者分離
            text: transcript,
            timestamp: Date.now(),
          };

          // 会話履歴に追加
          const updatedDialogue = [...dialogue, newUtterance];
          setDialogue(updatedDialogue);

          // SCAIN判定 (非同期)
          detectSCAIN(updatedDialogue, newUtterance);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // eslint-disable-next-line no-console
        console.error('音声認識エラー:', event.error);
        if (event.error === 'no-speech') {
          // eslint-disable-next-line no-console
          console.log('音声が検出されませんでした');
        }
      };

      recognition.onend = () => {
        // 自動再起動（continuous=trueでも止まることがある）
        if (isListening) {
          recognition.start();
        }
      };

      recognitionRef.current = recognition;
    }
  }, [dialogue, isListening, detectSCAIN]);

  const startListening = () => {
    try {
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start();
        setIsListening(true);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('音声認識の開始に失敗:', error);
      // already started エラーは無視
      if (error instanceof Error && error.message?.includes('already started')) {
        setIsListening(true);
      }
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const dismissNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearConversation = () => {
    setDialogue([]);
    setSCAINResults(new Map());
    setNotifications([]);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* ヘッダー */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">ATLAS</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Attention Temporal Link Analysis System
        </p>
      </header>

      {/* 通知エリア */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notif => (
          <NotificationPanel
            key={notif.id}
            notification={notif}
            onDismiss={() => dismissNotification(notif.id)}
          />
        ))}
      </div>

      {/* コントロールパネル */}
      <ControlPanel
        isListening={isListening}
        onStart={startListening}
        onStop={stopListening}
        onClear={clearConversation}
        utteranceCount={dialogue.length}
      />

      {/* 会話表示 */}
      <ConversationView dialogue={dialogue} scainResults={scainResults} />
    </div>
  );
}
