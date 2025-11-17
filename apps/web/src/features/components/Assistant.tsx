/**
 * Assistant Component
 * 専用リアルタイム会話アシスタント - メインコンポーネント
 */

'use client';

import type { Utterance } from '@atlas/core';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { emailToUsername } from '@/lib/supabase/username';
import { useStreamWithSupabase } from '../hooks/useStreamWithSupabase';
import { ConversationTimeline } from './ConversationTimeline';
import { SpeechRecognitionIndicator } from './SpeechRecognitionIndicator';

type AssistantProps = {
  boothId: string;
};

type InputMode = 'speech' | 'text';

export const Assistant = ({ boothId }: AssistantProps) => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin: isAdminUser } = useAdmin();
  const [inputMode, setInputMode] = useState<InputMode>('speech');
  const [textInput, setTextInput] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');

  // ユーザー名を自動的に話者名として使用
  const speakerName = useMemo(() => {
    return user?.email ? emailToUsername(user.email) : null;
  }, [user?.email]);

  // Stream Hook with Supabase (既存セッションを読み込む)
  const { sessionId, sessionInfo, dialogue, scores, dependencies, addUtterance } =
    useStreamWithSupabase({
      sessionId: boothId,
      onImportantDetected: () => {
        // 重要発言検出時の処理（必要に応じて通知などを追加）
      },
    });

  // UIモードを取得
  const uiMode =
    (sessionInfo?.experimentParams as { uiMode?: 'alpha' | 'beta' })?.uiMode || 'alpha';

  // 音声認識コールバック
  const handleTranscript = useCallback(
    (transcript: string, isFinal: boolean) => {
      // 空の発話は無視
      if (!speakerName || !transcript.trim()) {
        return;
      }

      // リアルタイムに一文字ごと表示
      setInterimTranscript(transcript.trim());

      if (isFinal) {
        // 確定した発話を履歴に追加
        const newUtterance: Utterance = {
          id: Date.now(),
          speaker: speakerName,
          text: transcript.trim(),
          timestamp: Date.now(),
        };

        addUtterance(newUtterance);
        // 次の発話のために少し待ってからクリア
        setTimeout(() => {
          setInterimTranscript('');
        }, 500);
      }
    },
    [speakerName, addUtterance]
  );

  // 音声認識
  const {
    isListening,
    startListening,
    stopListening: originalStopListening,
    isSupported,
  } = useSpeechRecognition({
    onTranscript: handleTranscript,
    onError: () => {
      // 音声認識エラー
    },
  });

  // 停止処理（途中の発話もクリア）
  const stopListening = useCallback(() => {
    originalStopListening();
    setInterimTranscript('');
  }, [originalStopListening]);

  // テキスト入力による発話追加（本体）
  const submitText = useCallback(() => {
    if (!speakerName || !textInput.trim()) return;

    // IDは一時的なもの（DB保存後に正しいIDに置き換わる）
    const newUtterance: Utterance = {
      id: Date.now(),
      speaker: speakerName,
      text: textInput.trim(),
      timestamp: Date.now(),
    };

    addUtterance(newUtterance);
    setTextInput('');
  }, [speakerName, textInput, addUtterance]);

  // フォーム送信ハンドラー
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitText();
  };

  // キーボードショートカット（Cmd+Enter / Ctrl+Enter で送信）
  const { handleKeyDown } = useKeyboardShortcut({
    onSubmit: submitText,
  });

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
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                      ({uiMode === 'beta' ? 'β' : 'α'})
                    </span>
                  </h1>
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

              {/* 入力モード切り替えボタン */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setInputMode('speech')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    inputMode === 'speech'
                      ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  disabled={!isSupported}
                >
                  🎤 音声
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    inputMode === 'text'
                      ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  ⌨️ テキスト
                </button>
              </div>

              {/* 音声コントロール（固定幅で常に表示） */}
              <div className="w-[100px]">
                {inputMode === 'speech' &&
                  isSupported &&
                  (!isListening ? (
                    <button
                      type="button"
                      onClick={startListening}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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
                      className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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
                  ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-6">
        <div className="flex flex-col gap-6">
          {/* テキスト入力フォーム（テキストモードのみ） */}
          {inputMode === 'text' && (
            <form
              onSubmit={handleTextSubmit}
              className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4"
            >
              <div className="flex flex-col gap-2">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="発話内容を入力..."
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!speakerName}
                  />
                  <button
                    type="submit"
                    disabled={!speakerName || !textInput.trim()}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    送信
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ⌘+Enter (Mac) / Ctrl+Enter (Windows) で送信
                </p>
              </div>
            </form>
          )}

          {/* タイムライン表示 */}
          <div className="h-[calc(100vh-280px)]">
            <ConversationTimeline
              dialogue={dialogue}
              scores={scores}
              dependencies={dependencies}
              currentUtterance={dialogue[dialogue.length - 1]}
              mode={uiMode}
            />
          </div>
          {isListening && (
            <div className="mt-4">
              <SpeechRecognitionIndicator
                isListening={isListening}
                interimTranscript={interimTranscript}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
