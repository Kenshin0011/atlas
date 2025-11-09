/**
 * DebugDependencyTree Component
 * 重要発言のチェイン（依存関係）を表示
 */

'use client';

import type { Utterance } from '@atlas/core';
import { useMemo } from 'react';
import type { DependencyEdge, ImportantUtterance, Score } from '../hooks/useStream';

type DebugDependencyTreeProps = {
  dialogue: Utterance[];
  scores: Map<number, Score>;
  dependencies: DependencyEdge[];
  importantList: ImportantUtterance[];
};

type ChainLink = {
  utteranceId: number;
  displayIndex: number;
  utterance: Utterance;
  score?: Score;
};

export const DebugDependencyTree = ({
  dialogue,
  scores,
  dependencies,
  importantList,
}: DebugDependencyTreeProps) => {
  // 各重要発言に対するチェインを構築
  const importantChains = useMemo(() => {
    if (importantList.length === 0) {
      return [];
    }

    // 重要発言のIDセット
    const importantIds = new Set(importantList.map(i => i.utterance.id));

    // 重要発言を時系列順にソート
    const sortedImportant = [...importantList].sort((a, b) => a.utterance.id - b.utterance.id);

    // 依存関係のマップを作成（to -> from[]）
    const depMap = new Map<number, number[]>();
    for (const dep of dependencies) {
      if (!depMap.has(dep.to)) {
        depMap.set(dep.to, []);
      }
      depMap.get(dep.to)?.push(dep.from);
    }

    // 各依存から遡って、過去の重要発言を集める
    const collectAncestors = (id: number): number[] => {
      const ancestors: number[] = [];
      const queue = [id];
      const visited = new Set<number>();

      while (queue.length > 0) {
        const current = queue.shift();
        if (!current || visited.has(current)) continue;
        visited.add(current);

        const deps = depMap.get(current) || [];
        const importantDeps = deps.filter(d => importantIds.has(d));

        for (const dep of importantDeps) {
          if (!visited.has(dep)) {
            ancestors.push(dep);
            queue.push(dep);
          }
        }
      }

      return ancestors.sort((a, b) => a - b);
    };

    // 逆引き: どの発話の分析で検出されたか (to -> [from])
    const detectedInMap = new Map<number, number[]>();
    for (const [toId, fromIds] of depMap.entries()) {
      for (const fromId of fromIds) {
        if (importantIds.has(fromId)) {
          if (!detectedInMap.has(fromId)) {
            detectedInMap.set(fromId, []);
          }
          detectedInMap.get(fromId)?.push(toId);
        }
      }
    }

    // 各重要発言に対するチェインを構築
    const result: Array<{
      targetId: number;
      targetUtterance: Utterance;
      targetScore: Score;
      chain: ChainLink[];
      directDeps: Set<number>; // この重要発言の直接の依存
      detectedFor: number[]; // この重要発言がどの発話に対して検出されたか
    }> = [];

    for (const imp of sortedImportant) {
      const targetId = imp.utterance.id;
      const directDeps = depMap.get(targetId) || [];
      const directDepsSet = new Set(directDeps);
      const detectedFor = detectedInMap.get(targetId) || [];

      // 全ての祖先を集める
      const allAncestors = new Set<number>();
      for (const depId of directDeps) {
        const ancestors = collectAncestors(depId);
        for (const ancestor of ancestors) {
          allAncestors.add(ancestor);
        }
      }

      // チェインを構築: 過去の重要発言 → 直接の依存 → ターゲット
      const pastImportant = Array.from(allAncestors).sort((a, b) => a - b);
      const chainIds = [...pastImportant, ...directDeps.sort((a, b) => a - b), targetId];

      const chain = chainIds
        .map(id => {
          const utt = dialogue.find(u => u.id === id);
          if (!utt) return null;
          const displayIndex = dialogue.findIndex(u => u.id === id);
          return {
            utteranceId: id,
            displayIndex: displayIndex !== -1 ? displayIndex : id,
            utterance: utt,
            score: scores.get(id),
          } as ChainLink;
        })
        .filter((link): link is ChainLink => link !== null);

      result.push({
        targetId,
        targetUtterance: imp.utterance,
        targetScore: imp.score,
        chain,
        directDeps: directDepsSet,
        detectedFor: detectedFor.sort((a, b) => a - b),
      });
    }

    return result;
  }, [dialogue, scores, dependencies, importantList]);

  if (importantChains.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
          🔗 重要発言のチェイン
        </h3>
        <div className="text-center text-slate-400 dark:text-slate-500 py-8">
          <p className="text-sm">重要発言がまだありません</p>
          <p className="text-xs mt-2">
            重要発言が検出されると、各重要発言に対するチェインが表示されます
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
        🔗 重要発言のチェイン ({importantChains.length}件の重要発言)
      </h3>

      {/* 各重要発言に対するチェインを表示 */}
      <div className="space-y-4 max-h-[800px] overflow-y-auto">
        {importantChains.map((chainData, _chainIdx) => (
          <div
            key={chainData.targetId}
            className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-400 dark:border-amber-600"
          >
            {/* チェインのタイトル */}
            <div className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-amber-500 text-white px-2 py-1 rounded">
                  重要発言 #{chainData.chain[chainData.chain.length - 1].displayIndex + 1}
                </span>
                <span>({chainData.chain.length}件のチェイン)</span>
              </div>
              {chainData.detectedFor.length > 0 && (
                <div className="text-xs">
                  <div className="text-slate-600 dark:text-slate-400 mb-2">検出元の発話:</div>
                  <div className="space-y-2">
                    {chainData.detectedFor.map(detectedId => {
                      const detectedUtt = dialogue.find(u => u.id === detectedId);
                      const detectedDisplayIndex = dialogue.findIndex(u => u.id === detectedId);
                      return (
                        <div
                          key={detectedId}
                          className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-blue-500 text-white px-2 py-0.5 rounded font-mono text-xs font-bold">
                              #
                              {detectedDisplayIndex !== -1
                                ? detectedDisplayIndex + 1
                                : detectedId + 1}
                            </span>
                            {detectedUtt && (
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {detectedUtt.speaker}
                              </span>
                            )}
                          </div>
                          {detectedUtt && (
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                              {detectedUtt.text}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {chainData.chain.map((link, idx) => {
                const isTarget = link.utteranceId === chainData.targetId;
                const isDirectDep = chainData.directDeps.has(link.utteranceId);
                const isPastImportant = link.score?.isImportant && !isDirectDep && !isTarget;

                return (
                  <div key={`${chainData.targetId}-${link.utteranceId}-${idx}`}>
                    {/* 発話カード */}
                    <div
                      className={`p-3 rounded-lg border ${
                        isTarget
                          ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-400 dark:border-amber-600'
                          : isDirectDep
                            ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400">
                          #{link.displayIndex + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {link.utterance.speaker}
                        </span>
                        {link.score && (
                          <span className="text-xs text-orange-700 dark:text-orange-300">
                            Score: {link.score.score.toFixed(3)}
                          </span>
                        )}
                        {link.score?.zScore !== undefined && (
                          <span
                            className={`text-xs font-semibold ${
                              link.score.zScore > 1.0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            z={link.score.zScore.toFixed(3)}
                          </span>
                        )}
                        {isPastImportant && (
                          <span className="text-xs bg-slate-400 dark:bg-slate-600 text-white px-2 py-0.5 rounded font-semibold">
                            過去重要
                          </span>
                        )}
                        {isDirectDep && (
                          <span className="text-xs bg-orange-500 dark:bg-orange-600 text-white px-2 py-0.5 rounded font-semibold">
                            🔗 今回検出
                          </span>
                        )}
                        {isTarget && (
                          <span className="text-xs bg-amber-600 dark:bg-amber-700 text-white px-2 py-0.5 rounded font-semibold">
                            ⭐ 重要発言
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {link.utterance.text}
                      </p>
                    </div>

                    {/* 矢印（最後の要素以外） */}
                    {idx < chainData.chain.length - 1 && (
                      <div className="flex items-center justify-center py-1">
                        <svg
                          className="w-5 h-5 text-amber-500 dark:text-amber-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <title>次へ</title>
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
