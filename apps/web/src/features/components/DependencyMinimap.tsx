/**
 * DependencyMinimap Component
 * 会話の依存関係を俯瞰するミニマップ
 */

'use client';

import type { Utterance } from '@atlas/core';
import type { Score } from '../hooks/useStream';

type Chain = {
  ids: number[];
  maxDeltaLoss: number;
  minPValue: number;
};

type DependencyMinimapProps = {
  dialogue: Utterance[];
  scores: Map<number, Score>;
  currentId?: number;
  onNodeClick?: (id: number) => void;
};

export const DependencyMinimap = ({
  dialogue,
  scores,
  currentId,
  onNodeClick,
}: DependencyMinimapProps) => {
  // 重要発話を抽出
  const importantUtterances = dialogue.filter(u => scores.get(u.id)?.isImportant);

  if (importantUtterances.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          依存関係マップ
        </h3>
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center py-8">
          重要な発話が検出されると、ここに依存関係が表示されます
        </div>
      </div>
    );
  }

  // 連鎖を検出（連続するID）
  const chains: Chain[] = [];
  let currentChain: number[] = [];

  for (let i = 0; i < importantUtterances.length; i++) {
    const curr = importantUtterances[i];
    const next = importantUtterances[i + 1];

    currentChain.push(curr.id);

    // 次の発話が連続していない、または最後の発話の場合
    if (!next || next.id !== curr.id + 1) {
      if (currentChain.length >= 1) {
        // チェーンの統計を計算
        const chainScores = currentChain
          .map(id => scores.get(id))
          .filter((s): s is Score => s !== undefined);

        chains.push({
          ids: [...currentChain],
          maxDeltaLoss: Math.max(...chainScores.map(s => s.detail.deltaLoss)),
          minPValue: Math.min(...chainScores.map(s => s.pValue ?? 1)),
        });
      }
      currentChain = [];
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
        依存関係マップ
      </h3>

      <div className="space-y-4">
        {chains.map((chain, chainIdx) => (
          <div key={chain.ids[0]} className="relative">
            {/* チェーン情報 */}
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              連鎖 {chainIdx + 1} ({chain.ids.length}発話)
            </div>

            {/* ノード表示 */}
            <div className="space-y-1">
              {chain.ids.map((id, idx) => {
                const score = scores.get(id);
                const isActive = id === currentId;

                // 色判定
                const color =
                  score?.pValue !== undefined && score.pValue < 0.05
                    ? 'bg-red-500'
                    : score?.pValue !== undefined && score.pValue < 0.1
                      ? 'bg-orange-500'
                      : 'bg-green-500';

                return (
                  <div key={id} className="flex items-center gap-2">
                    {/* 接続線 */}
                    {idx > 0 && (
                      <div className="w-4 h-4 border-l-2 border-slate-300 dark:border-slate-600 -mt-2" />
                    )}

                    {/* ノード */}
                    <button
                      type="button"
                      onClick={() => onNodeClick?.(id)}
                      className={`
												flex items-center gap-2 px-2 py-1 rounded text-xs
												transition-all
												${isActive ? 'ring-2 ring-blue-500' : ''}
												${onNodeClick ? 'hover:bg-slate-100 dark:hover:bg-slate-700' : ''}
											`}
                    >
                      <div className={`w-2 h-2 rounded-full ${color}`} />
                      <span className="font-mono text-slate-700 dark:text-slate-300">[{id}]</span>
                      {score && (
                        <span className="text-slate-500 dark:text-slate-400">
                          {score.score.toFixed(2)}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* チェーンの統計 */}
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 pl-6">
              最大Δ: {chain.maxDeltaLoss.toFixed(3)} | 最小p: {chain.minPValue.toFixed(3)}
            </div>
          </div>
        ))}
      </div>

      {/* 凡例 */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>p &lt; 0.05 (超重要)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span>p &lt; 0.1 (重要)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>検出済み</span>
          </div>
        </div>
      </div>
    </div>
  );
};
