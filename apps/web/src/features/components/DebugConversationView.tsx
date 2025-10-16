/**
 * DebugConversationView Component
 * デバッグ用の会話履歴表示（スコア付き）
 */

'use client';

import type { Utterance } from '@atlas/core';
import { useMemo } from 'react';
import type { DependencyEdge, Score } from '../hooks/useStream';

type DebugConversationViewProps = {
  dialogue: Utterance[];
  scores: Map<number, Score>;
  dependencies?: DependencyEdge[];
};

export const DebugConversationView = ({
  dialogue,
  scores,
  dependencies = [],
}: DebugConversationViewProps) => {
  // アンカー（他から依存されている）のIDセット
  const anchorIds = useMemo(() => {
    return new Set(dependencies.map(d => d.from));
  }, [dependencies]);

  // 依存している発話のIDセット
  const dependentIds = useMemo(() => {
    return new Set(dependencies.map(d => d.to));
  }, [dependencies]);
  if (dialogue.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
          💬 会話履歴
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
          会話データがありません
        </p>
      </div>
    );
  }

  // スコアの最大値・最小値を取得
  const scoreValues = Array.from(scores.values()).map(s => s.score);
  const maxScore = Math.max(...scoreValues, 0);
  const minScore = Math.min(...scoreValues, 0);
  const scoreRange = maxScore - minScore || 1;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
        💬 会話履歴 ({dialogue.length} 発話)
      </h2>

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {dialogue.map((utt, index) => {
          const score = scores.get(utt.id);
          const hasScore = score !== undefined;
          const isImportant = score?.isImportant || false;
          const isAnchor = anchorIds.has(utt.id);
          const isDependent = dependentIds.has(utt.id);

          // スコアの相対的な強度（0-100%）
          const scoreIntensity = hasScore ? ((score.score - minScore) / scoreRange) * 100 : 0;

          // 色分け: アンカー = オレンジ、依存発話（アンカーでない）= 緑、スコアあり = 青、なし = グレー
          const colorClasses = isAnchor
            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
            : isDependent
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : hasScore
                ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/30';

          return (
            <div
              key={utt.id}
              className={`p-3 rounded-lg border-l-4 transition-all ${colorClasses}`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* 左側：発話内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      #{index + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {utt.speaker}
                    </span>
                    {isImportant && <span className="text-sm">⭐</span>}
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200 break-words">
                    {utt.text}
                  </p>
                </div>

                {/* 右側：スコア情報 */}
                {hasScore && (
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Score</div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {score.score.toFixed(4)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500 dark:text-slate-400">p-value</div>
                      <div
                        className={`text-sm font-bold ${
                          score.pValue !== undefined && score.pValue < 0.1
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {score.pValue !== undefined ? score.pValue.toFixed(3) : 'N/A'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Rank</div>
                      <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        #{score.rank}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* スコアバー */}
              {hasScore && (
                <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      isAnchor
                        ? 'bg-gradient-to-r from-orange-400 to-orange-600'
                        : isDependent
                          ? 'bg-gradient-to-r from-green-400 to-green-600'
                          : 'bg-gradient-to-r from-blue-400 to-blue-600'
                    }`}
                    style={{ width: `${Math.max(scoreIntensity, 5)}%` }}
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
