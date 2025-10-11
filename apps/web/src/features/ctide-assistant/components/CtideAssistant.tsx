/**
 * CtideAssistant Component
 * CTIDE専用リアルタイム会話アシスタント - メインコンポーネント
 */

'use client';

import type { Utterance } from '@atlas/core';
import { useCallback, useEffect, useState } from 'react';
import { SpeakerNameModal } from '@/features/conversation-assistant/components/SpeakerNameModal';
import { useSpeechRecognition } from '@/features/conversation-assistant/hooks/useSpeechRecognition';
import {
  getSpeakerName,
  setSpeakerName,
} from '@/features/conversation-assistant/utils/speaker-storage';
import { useCtideStream } from '../hooks/useCtideStream';
import { ConversationStream } from './ConversationStream';
import { ImportantHighlights } from './ImportantHighlights';

export const CtideAssistant = () => {
  const [speakerName, setSpeakerNameState] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);

  // CTIDE Stream Hook
  const { dialogue, scores, importantList, addUtterance, clear, isAnalyzing, anchorCount } =
    useCtideStream({
      onImportantDetected: important => {
        console.log('🟢 重要発言検出:', important);
        // ここで通知などを追加可能
      },
    });

  // 話者名取得
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

  // 音声認識コールバック
  const handleTranscript = useCallback(
    (transcript: string, isFinal: boolean) => {
      if (isFinal && speakerName) {
        const newUtterance: Utterance = {
          id: dialogue.length,
          speaker: speakerName,
          text: transcript,
          timestamp: Date.now(),
        };

        addUtterance(newUtterance);
      }
    },
    [dialogue.length, speakerName, addUtterance]
  );

  // 音声認識
  const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition({
    onTranscript: handleTranscript,
    onError: error => {
      console.error('音声認識エラー:', error);
    },
  });

  // 手動で発話追加（テスト用）
  const handleManualAdd = () => {
    if (!speakerName) return;

    const testTexts = [
      '今日の会議では新しいプロジェクトについて話します',
      '予算は500万円を予定しています',
      '開発期間は3ヶ月を見込んでいます',
      'チームは5名で構成される予定です',
      '最終的な決定は来週の火曜日に行います',
    ];

    const randomText = testTexts[Math.floor(Math.random() * testTexts.length)];

    const newUtterance: Utterance = {
      id: dialogue.length,
      speaker: speakerName,
      text: randomText,
      timestamp: Date.now(),
    };

    addUtterance(newUtterance);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* Speaker Name Modal */}
      <SpeakerNameModal isOpen={showNameModal} onSubmit={handleSpeakerNameSubmit} />

      {/* ヘッダー */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>🟢</span>
                <span>CTIDE Assistant</span>
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Context-aware Temporal Information Detection Engine
              </p>
              {speakerName && (
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  話者: <span className="font-semibold">{speakerName}</span>
                </p>
              )}
            </div>

            {/* コントロール */}
            <div className="flex items-center gap-3">
              {isSupported ? (
                !isListening ? (
                  <button
                    type="button"
                    onClick={startListening}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <title>開始</title>
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    開始
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopListening}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <title>停止</title>
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                        clipRule="evenodd"
                      />
                    </svg>
                    停止
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={handleManualAdd}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  テスト追加
                </button>
              )}

              <button
                type="button"
                onClick={clear}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                disabled={dialogue.length === 0}
              >
                クリア
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 会話ストリーム (2/3) */}
          <div className="lg:col-span-2">
            <ConversationStream dialogue={dialogue} scores={scores} isAnalyzing={isAnalyzing} />
          </div>

          {/* 重要発言サイドバー (1/3) */}
          <div className="lg:col-span-1">
            <ImportantHighlights importantList={importantList} anchorCount={anchorCount} />
          </div>
        </div>
      </main>

      {/* リスニング状態インジケーター */}
      {isListening && (
        <div className="fixed bottom-4 left-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <title>録音中</title>
            <circle cx="10" cy="10" r="8" />
          </svg>
          <span className="text-sm font-medium">音声認識中...</span>
        </div>
      )}
    </div>
  );
};
