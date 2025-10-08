'use client';

import type { Utterance, SCAINResult } from '@atlas/core';
import { formatTimeAgo } from '@atlas/core';

interface ConversationViewProps {
  dialogue: Utterance[];
  scainResults: Map<number, SCAINResult>;
}

export function ConversationView({ dialogue, scainResults }: ConversationViewProps) {
  if (dialogue.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-12 text-center">
        <div className="text-slate-400 dark:text-slate-500">
          <svg
            className="w-16 h-16 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
          <p className="text-lg font-medium mb-2">会話が記録されていません</p>
          <p className="text-sm">「開始」ボタンを押して音声認識を開始してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">会話履歴</h2>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {dialogue.map(utterance => {
          const scainResult = scainResults.get(utterance.id);
          const isSCAIN = scainResult?.is_scain;

          return (
            <div
              key={utterance.id}
              className={`p-4 rounded-lg transition-all ${
                isSCAIN
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500'
                  : 'bg-slate-50 dark:bg-slate-700/50'
              }`}
            >
              {/* ヘッダー */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {utterance.speaker}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatTimeAgo(utterance.timestamp, Date.now())}
                  </span>
                </div>

                {isSCAIN && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded">
                      🔗 依存あり
                    </span>
                  </div>
                )}
              </div>

              {/* 発言内容 */}
              <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{utterance.text}</p>

              {/* SCAIN詳細 */}
              {scainResult && isSCAIN && (
                <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 dark:text-slate-400">依存タイプ:</span>
                      <span className="font-medium text-amber-700 dark:text-amber-400">
                        {scainResult.scain_type === 'short-term' && '短期'}
                        {scainResult.scain_type === 'mid-term' && '中期'}
                        {scainResult.scain_type === 'long-term' && '長期（伏線回収）'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 dark:text-slate-400">依存先:</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {scainResult.dependencies.length}個の発言
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 dark:text-slate-400">重要度:</span>
                      <div className="flex-1 bg-slate-200 dark:bg-slate-600 rounded-full h-2 max-w-[100px]">
                        <div
                          className="bg-amber-500 h-2 rounded-full"
                          style={{
                            width: `${scainResult.importance_score * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-slate-700 dark:text-slate-300">
                        {Math.round(scainResult.importance_score * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
