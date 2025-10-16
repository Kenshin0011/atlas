/**
 * ConversationStreamWithDependencies Component
 * 依存関係を可視化した会話ストリーム
 */

'use client';

import type { Utterance } from '@atlas/core';
import { formatTimeAgo } from '@atlas/core';
import type { Score } from '../hooks/useStream';

type ConversationStreamWithDependenciesProps = {
  dialogue: Utterance[];
  scores: Map<number, Score>;
  isAnalyzing?: boolean;
};

export const ConversationStreamWithDependencies = ({
  dialogue,
  scores,
  isAnalyzing = false,
}: ConversationStreamWithDependenciesProps) => {
  if (dialogue.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 text-center">
        <div className="text-slate-400 dark:text-slate-500">
          <svg
            className="w-12 h-12 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            role="img"
            aria-label="マイク"
          >
            <title>マイク</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
          <p className="text-base font-medium mb-1">会話を開始してください</p>
          <p className="text-sm">発話が追加されると、Atlasがリアルタイムで重要度を分析します</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
      {/* ヘッダー */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>📍</span>
            <span>現在の発言</span>
          </h2>
          {isAnalyzing && (
            <span className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <title>分析中</title>
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              分析中
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          最新の発言（全 {dialogue.length} 発話）
        </p>
      </div>

      {/* 現在の発話 */}
      <div className="p-4">
        {dialogue.slice(-1).map((utterance, _idx) => {
          const score = scores.get(utterance.id);

          return (
            <div
              key={utterance.id}
              className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {utterance.speaker}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-500">
                  {formatTimeAgo(utterance.timestamp, Date.now())}
                </span>
                {score?.isImportant && (
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                    重要
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">{utterance.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
