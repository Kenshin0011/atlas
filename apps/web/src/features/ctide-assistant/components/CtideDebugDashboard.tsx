/**
 * CtideDebugDashboard Component
 * CTIDE分析結果のデバッグダッシュボード
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
import { DebugAnchorMemory } from './DebugAnchorMemory';
import { DebugParameterControl } from './DebugParameterControl';
import { DebugScoreDetails } from './DebugScoreDetails';

export const CtideDebugDashboard = () => {
  const [speakerName, setSpeakerNameState] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [ctideParams, setCtideParams] = useState({
    k: 6,
    alphaMix: 0.6,
    halfLifeTurns: 20,
    nullSamples: 8,
    fdrAlpha: 0.1,
    mmrLambda: 0.7,
  });

  // CTIDE Stream Hook
  const { dialogue, scores, importantList, addUtterance, clear, isAnalyzing, anchorCount } =
    useCtideStream({
      ctideOptions: ctideParams,
      onImportantDetected: important => {
        console.log('[DEBUG] 🟢 重要発言検出:', important);
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

        console.log('[DEBUG] 📝 新しい発話:', newUtterance);
        addUtterance(newUtterance);
      }
    },
    [dialogue.length, speakerName, addUtterance]
  );

  // 音声認識
  const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition({
    onTranscript: handleTranscript,
    onError: error => {
      console.error('[DEBUG] ❌ 音声認識エラー:', error);
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
      {/* Speaker Name Modal */}
      <SpeakerNameModal isOpen={showNameModal} onSubmit={handleSpeakerNameSubmit} />

      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <span>🔬</span>
                <span>CTIDE Debug Dashboard</span>
              </h1>
              <p className="text-purple-100 mt-2">リアルタイム分析結果とパラメータ調整</p>
              {speakerName && (
                <p className="text-xs text-purple-200 mt-1">
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
              )}

              <button
                type="button"
                onClick={clear}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors"
                disabled={dialogue.length === 0}
              >
                クリア
              </button>
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
              currentParams={ctideParams}
              onParamsChange={params => {
                console.log('[DEBUG] ⚙️ パラメータ変更:', params);
                setCtideParams(params);
              }}
            />
            <DebugAnchorMemory importantList={importantList} anchorCount={anchorCount} />
          </div>

          {/* 右カラム: スコア詳細 */}
          <div className="lg:col-span-2">
            <DebugScoreDetails dialogue={dialogue} scores={scores} />
          </div>
        </div>
      </main>

      {/* リスニング状態インジケーター */}
      {isListening && (
        <div className="fixed bottom-4 left-4 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
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
