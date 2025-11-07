/**
 * DebugAnchorMemory Component
 * アンカーメモリの状態を可視化
 */

'use client';

import type { Utterance } from '@atlas/core';
import { useMemo } from 'react';
import type { DependencyEdge, ImportantUtterance } from '../hooks/useStream';

type DebugAnchorMemoryProps = {
  importantList: ImportantUtterance[];
  anchorCount: number;
  dialogue: Utterance[];
  dependencies: DependencyEdge[];
};

export const DebugAnchorMemory = ({
  importantList,
  anchorCount,
  dialogue,
  dependencies,
}: DebugAnchorMemoryProps) => {
  // 平均スコア計算
  const avgScore =
    importantList.length > 0
      ? importantList.reduce((sum, i) => sum + i.score.score, 0) / importantList.length
      : 0;

  // p値分布
  const significantCount = importantList.filter(
    i => i.score.pValue !== undefined && i.score.pValue < 0.05
  ).length;

  // 発話IDごとに重要発言をグループ化
  const utteranceChains = useMemo(() => {
    const chains = new Map<number, number[]>();

    for (const dep of dependencies) {
      const existing = chains.get(dep.to) || [];
      existing.push(dep.from);
      chains.set(dep.to, existing);
    }

    // 各チェインをソート（時系列順）
    for (const [key, value] of chains.entries()) {
      chains.set(
        key,
        value.sort((a, b) => a - b)
      );
    }

    return chains;
  }, [dependencies]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
        💾 アンカーメモリ状態
      </h2>

      {/* 統計情報 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-3 rounded-lg">
          <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">総アンカー数</div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{anchorCount}</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-3 rounded-lg">
          <div className="text-xs text-green-700 dark:text-green-300 font-medium">重要発言数</div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">
            {importantList.length}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-3 rounded-lg">
          <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">平均スコア</div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {avgScore.toFixed(2)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-3 rounded-lg">
          <div className="text-xs text-orange-700 dark:text-orange-300 font-medium">
            有意 (p&lt;0.05)
          </div>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
            {significantCount}
          </div>
        </div>
      </div>

      {/* 発話ごとの重要発言チェイン */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          発話ごとの重要発言チェイン
        </h3>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {utteranceChains.size === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
              まだ依存関係がありません
            </div>
          ) : (
            Array.from(utteranceChains.entries())
              .sort((a, b) => b[0] - a[0]) // 新しい発話から表示
              .map(([utteranceId, chainIds]) => {
                const utterance = dialogue.find(u => u.id === utteranceId);
                if (!utterance) return null;

                const displayIndex = dialogue.findIndex(u => u.id === utteranceId);

                return (
                  <div
                    key={utteranceId}
                    className="p-3 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700"
                  >
                    <div className="flex items-start gap-3">
                      {/* 左側：発話情報 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-purple-600 dark:text-purple-400 font-bold">
                            #{displayIndex !== -1 ? displayIndex + 1 : utteranceId + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {utterance.speaker}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-1 mb-2">
                          {utterance.text}
                        </p>

                        {/* 重要発言チェイン */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            重要発言:
                          </span>
                          {chainIds.map((chainId, _idx) => {
                            const chainUtt = dialogue.find(u => u.id === chainId);
                            const chainDisplayIndex = dialogue.findIndex(u => u.id === chainId);

                            return (
                              <span
                                key={chainId}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-600 rounded text-xs"
                              >
                                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                                  #{chainDisplayIndex !== -1 ? chainDisplayIndex + 1 : chainId + 1}
                                </span>
                                {chainUtt && (
                                  <span className="text-slate-600 dark:text-slate-400 truncate max-w-[100px]">
                                    {chainUtt.text}
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
};
