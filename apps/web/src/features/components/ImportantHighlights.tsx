/**
 * ImportantHighlights Component
 * 重要発言ハイライト一覧（サイドバー）
 */

'use client';

import { formatTimeAgo } from '@atlas/core';
import type { ImportantUtterance } from '../hooks/useCtideStream';

type ImportantHighlightsProps = {
  importantList: ImportantUtterance[];
  onUtteranceClick?: (important: ImportantUtterance) => void;
  anchorCount: number;
};

export const ImportantHighlights = ({
  importantList,
  onUtteranceClick,
  anchorCount,
}: ImportantHighlightsProps) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
      {/* ヘッダー */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>🟢</span>
            <span>重要発言</span>
          </h2>
          <span className="text-xl font-bold text-green-600 dark:text-green-400">
            {importantList.length}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          アンカーメモリ: {anchorCount} 件蓄積
        </p>
      </div>

      {/* 重要発言リスト */}
      <div className="p-3 space-y-2 max-h-[650px] overflow-y-auto">
        {importantList.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500">
            <p className="text-sm">まだ重要発言が検出されていません</p>
          </div>
        ) : (
          importantList.map((important, index) => {
            const { utterance, score } = important;

            // スコアレベル
            const level = score.score > 1.5 ? 'critical' : score.score > 1.0 ? 'high' : 'medium';

            // 色設定
            const colorClass =
              level === 'critical'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                : level === 'high'
                  ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                  : 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700';

            const textColorClass =
              level === 'critical'
                ? 'text-red-700 dark:text-red-300'
                : level === 'high'
                  ? 'text-orange-700 dark:text-orange-300'
                  : 'text-green-700 dark:text-green-300';

            return (
              <button
                key={`${utterance.id}-${index}`}
                type="button"
                onClick={() => onUtteranceClick?.(important)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all hover:shadow-md ${colorClass}`}
              >
                {/* ヘッダー */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {utterance.speaker}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-500">
                        {formatTimeAgo(utterance.timestamp, Date.now())}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 mb-2">
                      {utterance.text}
                    </p>
                  </div>
                </div>

                {/* スコア情報 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${textColorClass}`}>
                      スコア: {score.score.toFixed(2)}
                    </span>
                    {score.pValue !== undefined && score.pValue < 0.05 && (
                      <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                        p&lt;{score.pValue.toFixed(3)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    #{score.rank}
                  </span>
                </div>

                {/* 詳細情報 */}
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span title="情報差分（Δ損失）">Δ: {score.detail.deltaLoss.toFixed(3)}</span>
                  <span title="時間減衰">減衰: {score.detail.ageWeight.toFixed(2)}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* フッター統計 */}
      {importantList.length > 0 && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {importantList.filter(i => i.score.score > 1.5).length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">超重要</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {importantList.filter(i => i.score.score > 1.0 && i.score.score <= 1.5).length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">高重要</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
