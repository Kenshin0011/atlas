/**
 * Assistant Component
 * 専用リアルタイム会話アシスタント - メインコンポーネント
 */

'use client';

import type { Utterance } from '@atlas/core';
import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { emailToUsername } from '@/lib/supabase/username';
import { useStreamWithSupabase } from '../hooks/useStreamWithSupabase';
import { ConversationLayout } from './ConversationLayout';
import { ImportantHighlights } from './ImportantHighlights';

type AssistantProps = {
  boothId: string;
};

export const Assistant = ({ boothId }: AssistantProps) => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin: isAdminUser } = useAdmin();

  // ユーザー名を自動的に話者名として使用
  const speakerName = useMemo(() => {
    return user?.email ? emailToUsername(user.email) : null;
  }, [user?.email]);

  // Stream Hook with Supabase (既存セッションを読み込む)
  const {
    sessionId,
    sessionInfo,
    dialogue,
    scores,
    importantList,
    addUtterance,
    isAnalyzing,
    anchorCount,
  } = useStreamWithSupabase({
    sessionId: boothId,
    onImportantDetected: important => {
      console.log('🟢 重要発言検出:', important);
      // ここで通知などを追加可能
    },
  });

  // 音声認識コールバック
  const handleTranscript = useCallback(
    (transcript: string, isFinal: boolean) => {
      // 空の発話は無視
      if (!isFinal || !speakerName || !transcript.trim()) {
        return;
      }

      const newUtterance: Utterance = {
        id: dialogue.length,
        speaker: speakerName,
        text: transcript.trim(),
        timestamp: Date.now(),
      };

      addUtterance(newUtterance);
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
      {/* ヘッダー */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link
                  href="/"
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <title>ブース一覧に戻る</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span>🟢</span>
                    <span>{sessionInfo?.boothName || 'Atlas Assistant'}</span>
                  </h1>
                  {sessionInfo?.tags && sessionInfo.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {sessionInfo.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {user && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  ユーザー:{' '}
                  <span className="font-semibold">{emailToUsername(user.email || '')}</span>
                </p>
              )}
              {isAdminUser && (
                <div className="flex items-center gap-3 mt-2">
                  <Link
                    href="/sessions"
                    className="text-xs text-orange-600 dark:text-orange-400 underline hover:text-orange-700"
                  >
                    セッション管理
                  </Link>
                  {sessionId && (
                    <a
                      href={`/debug?session=${sessionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 underline hover:text-blue-700"
                    >
                      デバッグ
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* コントロール */}
            <div className="flex items-center gap-3">
              {!authLoading && user && (
                <button
                  type="button"
                  onClick={signOut}
                  className="px-3 py-1 text-sm bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded transition-colors"
                >
                  ログアウト
                </button>
              )}
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
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 gap-6">
          {/* 重要発言サマリー */}
          <ImportantHighlights importantList={importantList} anchorCount={anchorCount} />

          {/* 依存関係可視化レイアウト */}
          <ConversationLayout dialogue={dialogue} scores={scores} isAnalyzing={isAnalyzing} />
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
