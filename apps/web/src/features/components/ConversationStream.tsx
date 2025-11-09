/**
 * ConversationStream Component
 * リアルタイム会話表示（スコアベースハイライト）
 */

'use client';

import type { Utterance } from '@atlas/core';
import { formatTimeAgo } from '@atlas/core';
import type { Score } from '../hooks/useStream';

type ConversationStreamProps = {
  dialogue: Utterance[];
  scores: Map<number, Score>;
  onUtteranceClick?: (utterance: Utterance) => void;
  isAnalyzing?: boolean;
};

export const ConversationStream = ({
  dialogue,
  scores,
  onUtteranceClick,
  isAnalyzing = false,
}: ConversationStreamProps) => {
  if (dialogue.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center">
        <div className="text-slate-400 dark:text-slate-500">
          <svg
            className="w-20 h-20 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            role="img"
            aria-label="マイク"
          >
            <title>マイク</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
          <p className="text-lg font-medium mb-2">会話を開始してください</p>
          <p className="text-sm">発話が追加されると、Atlasがリアルタイムで重要度を分析します</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
      {/* ヘッダー */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            会話ストリーム
          </h2>
          <div className="flex items-center gap-3">
            {isAnalyzing && (
              <span className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
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
                分析中
              </span>
            )}
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {dialogue.length} 発話
            </span>
          </div>
        </div>
      </div>

      {/* 会話リスト */}
      <div className="p-4 space-y-3 max-h-[700px] overflow-y-auto">
        {dialogue.map(utterance => {
          const score = scores.get(utterance.id);

          // スコアレベル判定
          const level = score
            ? score.score > 1.5
              ? 'critical'
              : score.score > 1.0
                ? 'high'
                : score.score > 0.5
                  ? 'medium'
                  : 'low'
            : null;

          // 背景色とボーダー
          const colorClass = score?.isImportant
            ? level === 'critical'
              ? 'bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500'
              : level === 'high'
                ? 'bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-500'
                : 'bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500'
            : 'bg-slate-50 dark:bg-slate-700/30 border-l-2 border-slate-200 dark:border-slate-600';

          return (
            <button
              key={utterance.id}
              type="button"
              onClick={() => onUtteranceClick?.(utterance)}
              className={`w-full text-left p-4 rounded-lg transition-all ${colorClass} ${
                onUtteranceClick ? 'cursor-pointer hover:shadow-md' : ''
              }`}
            >
              {/* ヘッダー */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {utterance.speaker}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatTimeAgo(utterance.timestamp, Date.now())}
                  </span>
                </div>

                {/* スコアバッジ */}
                {score && (
                  <div className="flex items-center gap-2">
                    {score.isImportant && <span className="text-lg">🟢</span>}
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded ${
                        level === 'critical'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : level === 'high'
                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                            : level === 'medium'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {score.score.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* 発言内容 */}
              <p
                className={`leading-relaxed ${
                  score?.isImportant
                    ? 'text-slate-900 dark:text-slate-100 font-medium'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {utterance.text}
              </p>

              {/* 詳細（重要発言のみ） */}
              {score?.isImportant && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                  <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                    <span>Δ損失: {score.detail.deltaLoss.toFixed(3)}</span>
                    <span>時間減衰: {score.detail.ageWeight.toFixed(2)}</span>
                    {score.zScore !== undefined && (
                      <span className="text-purple-600 dark:text-purple-400">
                        z = {score.zScore.toFixed(3)}
                      </span>
                    )}
                    <span className="text-blue-600 dark:text-blue-400">ランク: #{score.rank}</span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
