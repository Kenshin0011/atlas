/**
 * ConversationStreamWithDependencies Component
 * 依存関係を可視化した会話ストリーム
 */

'use client';

import type { Utterance } from '@atlas/core';
import { formatTimeAgo } from '@atlas/core';
import type { Score } from '../hooks/useStream';
import { DependencyArrow } from './DependencyArrow';

type ConversationStreamWithDependenciesProps = {
  dialogue: Utterance[];
  scores: Map<number, Score>;
  onUtteranceClick?: (utterance: Utterance) => void;
  isAnalyzing?: boolean;
  highlightedIds?: number[];
};

export const ConversationStreamWithDependencies = ({
  dialogue,
  scores,
  onUtteranceClick,
  isAnalyzing = false,
  highlightedIds = [],
}: ConversationStreamWithDependenciesProps) => {
  if (dialogue.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 text-center">
        <div className="text-slate-400 dark:text-slate-500">
          <svg
            className="w-12 h-12 mx-auto mb-3"
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
          <p className="text-base font-medium mb-1">会話を開始してください</p>
          <p className="text-sm">発話が追加されると、Atlasがリアルタイムで重要度を分析します</p>
        </div>
      </div>
    );
  }

  // 重要発話のIDセット
  const importantIds = new Set(
    Array.from(scores.values())
      .filter(s => s.isImportant)
      .map(s => s.utteranceId)
  );

  // 依存関係の検出（簡易版：重要発話の直後の発話を依存先と判定）
  const dependencies = new Map<number, number>(); // from -> to
  const importantList = dialogue.filter(u => importantIds.has(u.id));

  for (let i = 0; i < importantList.length - 1; i++) {
    const curr = importantList[i];
    const next = importantList[i + 1];
    // 連続している、または1-2発話以内の距離なら依存関係とみなす
    if (next.id - curr.id <= 3) {
      dependencies.set(curr.id, next.id);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
      {/* ヘッダー */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">現在の発話</h2>
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

      {/* 現在の発話 */}
      <div className="p-4">
        {dialogue.slice(-1).map((utterance, _idx) => {
          const displayIndex = dialogue.length; // 最後の発話なので全体の長さ
          const score = scores.get(utterance.id);
          const isHighlighted = highlightedIds.includes(utterance.id);
          const hasDependencyTo = dependencies.get(utterance.id);
          const previousUtterance = dialogue.length > 1 ? dialogue[dialogue.length - 2] : null;
          const isDependencyFrom =
            previousUtterance && dependencies.get(previousUtterance.id) === utterance.id;

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

          const highlightClass = isHighlighted ? 'ring-2 ring-blue-500 shadow-lg' : '';

          return (
            <div key={utterance.id}>
              {/* 依存元からの矢印 */}
              {isDependencyFrom && previousUtterance && (
                <div className="pl-8 py-1">
                  <DependencyArrow
                    deltaLoss={scores.get(previousUtterance.id)?.detail.deltaLoss ?? 0}
                    pValue={scores.get(previousUtterance.id)?.pValue ?? 1}
                    direction="down"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => onUtteranceClick?.(utterance)}
                data-utterance-id={utterance.id}
                className={`w-full text-left p-3 rounded-lg transition-all ${colorClass} ${highlightClass} ${
                  onUtteranceClick ? 'cursor-pointer hover:shadow-md' : ''
                }`}
              >
                {/* ヘッダー */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      [#{displayIndex}]
                    </span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {utterance.speaker}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatTimeAgo(utterance.timestamp, Date.now())}
                    </span>
                  </div>

                  {/* スコアバッジ */}
                  {score && (
                    <div className="flex items-center gap-1.5">
                      {score.isImportant && <span className="text-base">⭐</span>}
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded ${
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
                  className={`text-sm leading-relaxed ${
                    score?.isImportant
                      ? 'text-slate-900 dark:text-slate-100 font-medium'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {utterance.text}
                </p>
              </button>

              {/* 依存先への矢印 */}
              {hasDependencyTo && (
                <div className="pl-8 py-1">
                  <DependencyArrow
                    deltaLoss={score?.detail.deltaLoss ?? 0}
                    pValue={score?.pValue ?? 1}
                    direction="down"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
