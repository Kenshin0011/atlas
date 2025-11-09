/**
 * DebugConversationView Component
 * デバッグ用の会話履歴表示（スコア付き）
 */

'use client';

import type { Utterance } from '@atlas/core';
import { useMemo, useState } from 'react';
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
  // 選択された発話ID
  const [selectedUtteranceId, setSelectedUtteranceId] = useState<number | null>(null);

  // アンカー（他から依存されている）のIDセット
  const anchorIds = useMemo(() => {
    return new Set(dependencies.map(d => d.from));
  }, [dependencies]);

  // 依存している発話のIDセット
  const dependentIds = useMemo(() => {
    return new Set(dependencies.map(d => d.to));
  }, [dependencies]);

  // 選択された発話に対する重要な発言チェインを取得
  const importantChain = useMemo(() => {
    if (selectedUtteranceId === null) return [];

    // selectedUtteranceIdをtoとする依存関係を探す
    const chainIds = dependencies
      .filter(d => d.to === selectedUtteranceId)
      .map(d => d.from)
      .sort((a, b) => a - b); // IDでソート（時系列順）

    return chainIds
      .map(id => dialogue.find(u => u.id === id))
      .filter((u): u is Utterance => u !== undefined);
  }, [selectedUtteranceId, dependencies, dialogue]);
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          💬 会話履歴 ({dialogue.length} 発話)
        </h2>
        {selectedUtteranceId !== null && (
          <button
            type="button"
            onClick={() => setSelectedUtteranceId(null)}
            className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            選択解除
          </button>
        )}
      </div>

      {/* 選択された発話の重要な発言チェイン表示 */}
      {selectedUtteranceId !== null && importantChain.length > 0 && (
        <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
          <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-2 flex items-center gap-2">
            <span>🔗</span>
            <span>
              選択された発話 #{selectedUtteranceId + 1} に対する重要な発言チェイン (
              {importantChain.length}件)
            </span>
          </h3>
          <div className="space-y-2">
            {importantChain.map(chainUtt => {
              const chainScore = scores.get(chainUtt.id);
              return (
                <div
                  key={chainUtt.id}
                  className="p-2 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      #{chainUtt.id + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {chainUtt.speaker}
                    </span>
                    {chainScore && (
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                        Score: {chainScore.score.toFixed(4)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200">{chainUtt.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {dialogue.map((utt, index) => {
          const score = scores.get(utt.id);
          const hasScore = score !== undefined;
          const isImportant = score?.isImportant || false;
          const isAnchor = anchorIds.has(utt.id);
          const isDependent = dependentIds.has(utt.id);
          const isSelected = selectedUtteranceId === utt.id;

          // スコアの相対的な強度（0-100%）
          const scoreIntensity = hasScore ? ((score.score - minScore) / scoreRange) * 100 : 0;

          // 色分け: 選択中 = パープル、アンカー = オレンジ、依存発話（アンカーでない）= 緑、スコアあり = 青、なし = グレー
          const colorClasses = isSelected
            ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/30 ring-2 ring-purple-400'
            : isAnchor
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
              : isDependent
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : hasScore
                  ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/30';

          return (
            <button
              type="button"
              key={utt.id}
              onClick={() => setSelectedUtteranceId(isSelected ? null : utt.id)}
              className={`w-full p-3 rounded-lg border-l-4 transition-all text-left hover:shadow-md ${colorClasses} ${
                isDependent ? 'cursor-pointer' : 'cursor-default'
              }`}
              disabled={!isDependent}
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
                    {isDependent && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        📎 依存あり
                      </span>
                    )}
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
                      <div className="text-xs text-slate-500 dark:text-slate-400">z-score</div>
                      <div
                        className={`text-sm font-bold ${
                          score.zScore !== undefined && score.zScore > 1.0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {score.zScore !== undefined ? score.zScore.toFixed(3) : 'N/A'}
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
                      isSelected
                        ? 'bg-gradient-to-r from-purple-400 to-purple-600'
                        : isAnchor
                          ? 'bg-gradient-to-r from-orange-400 to-orange-600'
                          : isDependent
                            ? 'bg-gradient-to-r from-green-400 to-green-600'
                            : 'bg-gradient-to-r from-blue-400 to-blue-600'
                    }`}
                    style={{ width: `${Math.max(scoreIntensity, 5)}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
