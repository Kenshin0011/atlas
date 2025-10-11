/**
 * DebugAnchorMemory Component
 * アンカーメモリの状態を可視化
 */

'use client';

import type { ImportantUtterance } from '../hooks/useCtideStream';

type DebugAnchorMemoryProps = {
  importantList: ImportantUtterance[];
  anchorCount: number;
};

export const DebugAnchorMemory = ({ importantList, anchorCount }: DebugAnchorMemoryProps) => {
  // スコア別に分類
  const critical = importantList.filter(i => i.score.score > 1.5);
  const high = importantList.filter(i => i.score.score > 1.0 && i.score.score <= 1.5);
  const medium = importantList.filter(i => i.score.score <= 1.0);

  // 平均スコア計算
  const avgScore =
    importantList.length > 0
      ? importantList.reduce((sum, i) => sum + i.score.score, 0) / importantList.length
      : 0;

  // p値分布
  const significantCount = importantList.filter(
    i => i.score.pValue !== undefined && i.score.pValue < 0.05
  ).length;

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

      {/* レベル別分布 */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          重要度レベル分布
        </h3>
        <div className="space-y-2">
          {/* Critical */}
          <div className="flex items-center gap-3">
            <div className="w-20 text-xs text-slate-600 dark:text-slate-400">Critical</div>
            <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-6 overflow-hidden">
              <div
                className="bg-red-500 h-full flex items-center justify-center text-xs font-bold text-white"
                style={{
                  width: `${importantList.length > 0 ? (critical.length / importantList.length) * 100 : 0}%`,
                }}
              >
                {critical.length > 0 && <span>{critical.length}</span>}
              </div>
            </div>
            <div className="w-16 text-xs text-right text-slate-600 dark:text-slate-400">
              {critical.length} (
              {importantList.length > 0
                ? ((critical.length / importantList.length) * 100).toFixed(1)
                : 0}
              %)
            </div>
          </div>

          {/* High */}
          <div className="flex items-center gap-3">
            <div className="w-20 text-xs text-slate-600 dark:text-slate-400">High</div>
            <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-6 overflow-hidden">
              <div
                className="bg-orange-500 h-full flex items-center justify-center text-xs font-bold text-white"
                style={{
                  width: `${importantList.length > 0 ? (high.length / importantList.length) * 100 : 0}%`,
                }}
              >
                {high.length > 0 && <span>{high.length}</span>}
              </div>
            </div>
            <div className="w-16 text-xs text-right text-slate-600 dark:text-slate-400">
              {high.length} (
              {importantList.length > 0
                ? ((high.length / importantList.length) * 100).toFixed(1)
                : 0}
              %)
            </div>
          </div>

          {/* Medium */}
          <div className="flex items-center gap-3">
            <div className="w-20 text-xs text-slate-600 dark:text-slate-400">Medium</div>
            <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-6 overflow-hidden">
              <div
                className="bg-green-500 h-full flex items-center justify-center text-xs font-bold text-white"
                style={{
                  width: `${importantList.length > 0 ? (medium.length / importantList.length) * 100 : 0}%`,
                }}
              >
                {medium.length > 0 && <span>{medium.length}</span>}
              </div>
            </div>
            <div className="w-16 text-xs text-right text-slate-600 dark:text-slate-400">
              {medium.length} (
              {importantList.length > 0
                ? ((medium.length / importantList.length) * 100).toFixed(1)
                : 0}
              %)
            </div>
          </div>
        </div>
      </div>

      {/* 最近の重要発言 */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          最近の重要発言 (最新5件)
        </h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {importantList.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
              まだ重要発言がありません
            </div>
          ) : (
            importantList
              .slice(-5)
              .reverse()
              .map(important => {
                const { utterance, score } = important;
                const level =
                  score.score > 1.5 ? 'critical' : score.score > 1.0 ? 'high' : 'medium';
                const bgColor =
                  level === 'critical'
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : level === 'high'
                      ? 'bg-orange-50 dark:bg-orange-900/20'
                      : 'bg-green-50 dark:bg-green-900/20';

                return (
                  <div key={utterance.id} className={`p-3 rounded ${bgColor}`}>
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {utterance.speaker}
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {score.score.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                      {utterance.text}
                    </p>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
};
