/**
 * DebugDashboard Component
 * 分析結果のデバッグダッシュボード
 * URLクエリパラメータ ?session=xxx で指定されたセッションをリアルタイム表示
 */

'use client';

import { defaultOptions, type Utterance } from '@atlas/core';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { emailToUsername } from '@/lib/supabase/username';
import { useStreamWithSupabase } from '../hooks/useStreamWithSupabase';
import { DebugAnchorMemory } from './DebugAnchorMemory';
import { DebugConversationView } from './DebugConversationView';
import { DebugDependencyTree } from './DebugDependencyTree';
import { DebugParameterControl } from './DebugParameterControl';

const DebugDashboardContent = () => {
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams.get('session');
  const { user } = useAuth();
  const [interimTranscript, setInterimTranscript] = useState('');

  // ユーザー名を自動的に話者名として使用
  const speakerName = useMemo(() => {
    return user?.email ? emailToUsername(user.email) : null;
  }, [user?.email]);

  // @atlas/core の defaultOptions を使用
  const [params, setParams] = useState({
    k: defaultOptions.k,
    alphaMix: defaultOptions.alphaMix,
    halfLifeTurns: defaultOptions.halfLifeTurns,
    nullSamples: defaultOptions.nullSamples,
    fdrAlpha: defaultOptions.fdrAlpha,
    mmrLambda: defaultOptions.mmrLambda,
  });

  // Stream Hook with Supabase
  // sessionIdが指定されている場合は既存セッションを表示（読み取り専用）
  const {
    sessionId,
    sessionInfo,
    dialogue,
    scores,
    importantList,
    dependencies,
    addUtterance,
    isAnalyzing,
    anchorCount,
  } = useStreamWithSupabase({
    sessionId: sessionIdFromUrl || undefined,
    analysisOptions: params,
    onImportantDetected: important => {
      console.log('[DEBUG] 🟢 重要発言検出:', important);
    },
  });

  // 音声認識コールバック
  const handleTranscript = useCallback(
    (transcript: string, isFinal: boolean) => {
      if (!speakerName || !transcript.trim()) {
        return;
      }

      // リアルタイムに一文字ごと表示
      setInterimTranscript(transcript.trim());

      if (isFinal) {
        // 確定した発話を履歴に追加
        const newUtterance: Utterance = {
          id: dialogue.length,
          speaker: speakerName,
          text: transcript.trim(),
          timestamp: Date.now(),
        };

        console.log('[DEBUG] 📝 新しい発話:', newUtterance);
        addUtterance(newUtterance);
        // 次の発話のために少し待ってからクリア
        setTimeout(() => {
          setInterimTranscript('');
        }, 500);
      }
    },
    [dialogue.length, speakerName, addUtterance]
  );

  // 音声認識
  const {
    isListening,
    startListening,
    stopListening: originalStopListening,
    isSupported,
  } = useSpeechRecognition({
    onTranscript: handleTranscript,
    onError: error => {
      console.error('[DEBUG] ❌ 音声認識エラー:', error);
    },
  });

  // 停止処理（途中の発話もクリア）
  const stopListening = useCallback(() => {
    originalStopListening();
    setInterimTranscript('');
  }, [originalStopListening]);

  // 手動で発話追加（テスト用）
  const handleManualAdd = () => {
    if (!speakerName) return;

    const testTexts = [
      '今日の会議では新しいプロジェクトについて話します',
      '予算は500万円を予定しています',
      '開発期間は3ヶ月を見込んでいます',
      'チームは5名で構成される予定です',
      '最終的な決定は来週の火曜日に行います',
      'デモは10月18日に予定しています',
      'B社の要望を反映して資料を修正します',
      'コスト見積りはスタンダードプランで確定します',
    ];

    const randomText = testTexts[Math.floor(Math.random() * testTexts.length)];

    const newUtterance: Utterance = {
      id: dialogue.length,
      speaker: speakerName,
      text: randomText,
      timestamp: Date.now(),
    };

    console.log('[DEBUG] 📝 テスト発話追加:', newUtterance);
    addUtterance(newUtterance);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <span>🔬</span>
                <span>Atlas Debug Dashboard</span>
              </h1>
              <p className="text-purple-100 mt-2">
                {sessionIdFromUrl
                  ? 'セッション表示モード（リアルタイム同期）'
                  : 'リアルタイム分析結果とパラメータ調整'}
              </p>
              {user && (
                <p className="text-xs text-purple-200 mt-1">
                  ユーザー:{' '}
                  <span className="font-semibold">{emailToUsername(user.email || '')}</span>
                </p>
              )}
              {sessionId && (
                <p className="text-xs text-purple-200 mt-1">
                  セッションID: <span className="font-mono font-semibold">{sessionId}</span>
                </p>
              )}
              {sessionInfo?.username && (
                <p className="text-xs text-purple-200 mt-1">
                  作成者: <span className="font-semibold">{sessionInfo.username}</span>
                </p>
              )}
            </div>

            {/* コントロール（読み取り専用モードでは無効化） */}
            <div className="flex items-center gap-3">
              {!sessionIdFromUrl &&
                (isSupported ? (
                  !isListening ? (
                    <button
                      type="button"
                      onClick={startListening}
                      className="px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors flex items-center gap-2"
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
                    className="px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors"
                  >
                    テスト追加
                  </button>
                ))}
              {sessionIdFromUrl && (
                <div className="px-4 py-2 bg-white/20 text-white rounded-lg text-sm">
                  読み取り専用モード（リアルタイム同期中）
                </div>
              )}
            </div>
          </div>

          {/* ステータスバー */}
          <div className="mt-4 flex items-center gap-6 text-sm text-purple-100">
            <div className="flex items-center gap-2">
              <span className="font-semibold">発話数:</span>
              <span className="bg-white/20 px-2 py-1 rounded">{dialogue.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">重要発言:</span>
              <span className="bg-white/20 px-2 py-1 rounded">{importantList.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">アンカー:</span>
              <span className="bg-white/20 px-2 py-1 rounded">{anchorCount}</span>
            </div>
            {isAnalyzing && (
              <div className="flex items-center gap-2 text-yellow-200">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <title>分析中</title>
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="font-medium">分析中...</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左カラム: パラメータ制御 */}
          <div className="lg:col-span-1 space-y-6">
            <DebugParameterControl
              currentParams={params}
              onParamsChange={p => {
                setParams(p);
              }}
            />
            <DebugAnchorMemory importantList={importantList} anchorCount={anchorCount} />
          </div>

          {/* 中央カラム: 会話履歴（スコア付き） */}
          <div className="lg:col-span-1">
            <DebugConversationView
              dialogue={dialogue}
              scores={scores}
              dependencies={dependencies}
            />
          </div>

          {/* 右カラム: 依存関係ツリー */}
          <div className="lg:col-span-1">
            <DebugDependencyTree dialogue={dialogue} scores={scores} dependencies={dependencies} />
          </div>
        </div>
      </main>

      {/* リスニング状態インジケーター＆リアルタイム文字起こし */}
      {isListening && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4">
          <div className="bg-purple-600 text-white px-8 py-6 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-6 h-6 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <title>録音中</title>
                <circle cx="10" cy="10" r="8" />
              </svg>
              <span className="text-base font-bold">音声認識中...</span>
            </div>
            <div className="bg-white/20 rounded-xl px-6 py-4 min-h-[60px] flex items-center">
              <p className="text-white text-xl leading-relaxed font-medium">
                {interimTranscript || '話してください...'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const DebugDashboard = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
          <div className="text-slate-600 dark:text-slate-400">読み込み中...</div>
        </div>
      }
    >
      <DebugDashboardContent />
    </Suspense>
  );
};
