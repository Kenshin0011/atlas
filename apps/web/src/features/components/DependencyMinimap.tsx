/**
 * DependencyMinimap Component
 * 会話の依存関係を俯瞰するミニマップ
 */

'use client';

import type { Utterance } from '@atlas/core';
import type { Score } from '../hooks/useStream';

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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
        依存関係マップ
      </h3>

      <div className="space-y-1">
        {importantUtterances.map((utt, idx) => {
          const isActive = utt.id === currentId;
          const utterance = dialogue.find(u => u.id === utt.id);

          return (
            <div key={utt.id} className="flex items-start gap-2">
              {/* 接続線 */}
              {idx > 0 && (
                <div className="w-3 h-6 border-l-2 border-green-300 dark:border-green-700 -mt-3 ml-1" />
              )}

              {/* ノード */}
              <button
                type="button"
                onClick={() => onNodeClick?.(utt.id)}
                className={`
                  flex items-start gap-2 px-3 py-2 rounded-lg text-xs flex-1
                  transition-all bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800
                  ${isActive ? 'ring-2 ring-blue-500' : ''}
                  ${onNodeClick ? 'hover:bg-green-100 dark:hover:bg-green-900/30' : ''}
                `}
              >
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-slate-700 dark:text-slate-300 break-words">
                    {utterance?.text}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
