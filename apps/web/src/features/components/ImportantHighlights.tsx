/**
 * ImportantHighlights Component
 * 重要発言ハイライト一覧（サイドバー）
 */

'use client';

import type { Utterance } from '@atlas/core';
import { formatTimeAgo } from '@atlas/core';
import { useMemo } from 'react';
import type { DependencyEdge, Score } from '../hooks/useStream';

type ImportantHighlightsProps = {
  dependencies: DependencyEdge[];
  dialogue: Utterance[];
  scores: Map<number, Score>;
};

export const ImportantHighlights = ({
  dependencies,
  dialogue,
  scores,
}: ImportantHighlightsProps) => {
  // 依存関係を再帰的に辿って、現在の重要発話チェーンを構築
  const importantUtterances = useMemo(() => {
    // 最新の重要発話を見つける
    const allImportantIds: number[] = [];
    for (const [id, score] of scores.entries()) {
      if (score.isImportant) {
        allImportantIds.push(id);
      }
    }
    allImportantIds.sort((a, b) => b - a); // 降順（新しい順）

    if (allImportantIds.length === 0) {
      return [];
    }

    // 最新の重要発話を起点に依存チェーンを構築
    const latestImportantId = allImportantIds[0];

    // 再帰的に依存元を辿る
    const buildDependencyChain = (targetId: number, visited = new Set<number>()): number[] => {
      if (visited.has(targetId)) return []; // 循環参照防止
      visited.add(targetId);

      const chain = [targetId];
      const dependsOn = dependencies.filter(d => d.to === targetId).map(d => d.from);

      for (const fromId of dependsOn) {
        const subChain = buildDependencyChain(fromId, visited);
        chain.unshift(...subChain);
      }

      return chain;
    };

    const chainIds = buildDependencyChain(latestImportantId);
    const uniqueIds = [...new Set(chainIds)]; // 重複削除

    return dialogue.filter(u => uniqueIds.includes(u.id)).sort((a, b) => a.id - b.id);
  }, [dialogue, scores, dependencies]);

  // アンカー（他から依存されている重要発話）と依存している発話を区別
  const anchorIds = useMemo(() => {
    return new Set(dependencies.map(d => d.from));
  }, [dependencies]);

  const dependentIds = useMemo(() => {
    return new Set(dependencies.map(d => d.to));
  }, [dependencies]);

  const importantCount = importantUtterances.length;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
      {/* ヘッダー */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>🔗</span>
            <span>重要発言チェイン</span>
          </h2>
          <span className="text-xl font-bold text-green-600 dark:text-green-400">
            {importantCount}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">時系列で繋がった重要な流れ</p>
      </div>

      {/* 重要発言リスト */}
      <div className="p-3 space-y-1 max-h-[650px] overflow-y-auto">
        {importantUtterances.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500">
            <p className="text-sm">まだ重要発言が検出されていません</p>
          </div>
        ) : (
          importantUtterances.map((utterance, index) => {
            const isAnchor = anchorIds.has(utterance.id);
            const isDependent = dependentIds.has(utterance.id);

            // 重要発話として検出されたもの（dependent/to）= オレンジ、依存元（anchor/from）= 緑
            const colorClasses = isDependent
              ? {
                  line: 'bg-orange-400 dark:bg-orange-600',
                  arrow: 'text-orange-400 dark:text-orange-600',
                  bg: 'bg-orange-50 dark:bg-orange-900/20',
                  border: 'border-orange-200 dark:border-orange-800',
                  dot: 'bg-orange-500',
                  badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
                }
              : {
                  line: 'bg-green-400 dark:bg-green-600',
                  arrow: 'text-green-400 dark:text-green-600',
                  bg: 'bg-green-50 dark:bg-green-900/20',
                  border: 'border-green-200 dark:border-green-800',
                  dot: 'bg-green-500',
                  badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
                };

            return (
              <div key={utterance.id} className="relative">
                {/* 接続線と矢印 */}
                {index > 0 && (
                  <div className="flex items-center justify-center h-8 -mb-2">
                    <div className="flex flex-col items-center">
                      <div className={`w-0.5 h-4 ${colorClasses.line}`} />
                      <svg
                        className={`w-4 h-4 ${colorClasses.arrow}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <title>依存</title>
                        <path
                          fillRule="evenodd"
                          d="M10 3a1 1 0 011 1v10.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V4a1 1 0 011-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                )}

                {/* 発話カード */}
                <div
                  className={`w-full text-left p-3 rounded-lg border transition-all ${colorClasses.bg} ${colorClasses.border}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${colorClasses.dot} flex-shrink-0`} />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {utterance.speaker}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-500">
                      {formatTimeAgo(utterance.timestamp, Date.now())}
                    </span>
                    {isDependent && (
                      <span className={`text-xs px-2 py-0.5 rounded ${colorClasses.badge}`}>
                        重要検出
                      </span>
                    )}
                    {isAnchor && !isDependent && (
                      <span className={`text-xs px-2 py-0.5 rounded ${colorClasses.badge}`}>
                        依存元
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{utterance.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
