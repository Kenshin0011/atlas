/**
 * DebugScoreDetails Component
 * 分析結果の詳細デバッグビュー
 */

'use client';

import type { Utterance } from '@atlas/core';
import { formatTimeAgo } from '@atlas/core';
import type { Score } from '../hooks/useStream';

type DebugScoreDetailsProps = {
  dialogue: Utterance[];
  scores: Map<number, Score>;
};

export const DebugScoreDetails = ({ dialogue, scores }: DebugScoreDetailsProps) => {
  // スコアを配列に変換してソート
  const scoredUtterances = dialogue
    .map(utt => {
      const score = scores.get(utt.id);
      return { utterance: utt, score };
    })
    .filter((item): item is { utterance: Utterance; score: Score } => item.score !== undefined)
    .sort((a, b) => b.score.score - a.score.score);

  if (scoredUtterances.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
          📊 スコア詳細デバッグ
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
          スコアデータがありません
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
        📊 スコア詳細デバッグ ({scoredUtterances.length} 件)
      </h2>

      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {scoredUtterances.map(({ utterance, score }) => {
          const { detail } = score;

          return (
            <div
              key={utterance.id}
              className={`p-4 rounded-lg border-2 ${
                score.isImportant
                  ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50'
              }`}
            >
              {/* ヘッダー */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {utterance.speaker}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatTimeAgo(utterance.timestamp, Date.now())}
                    </span>
                    <span className="text-xs text-slate-400">ID: {utterance.id}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                    {utterance.text}
                  </p>
                </div>
                {score.isImportant && <span className="text-lg ml-2 flex-shrink-0">🟢</span>}
              </div>

              {/* スコア概要 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div className="bg-white dark:bg-slate-800 p-2 rounded">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Final Score</div>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    {score.score.toFixed(3)}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-2 rounded">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Rank</div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    #{score.rank}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-2 rounded">
                  <div className="text-xs text-slate-500 dark:text-slate-400">z-score</div>
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {score.zScore !== undefined ? score.zScore.toFixed(4) : 'N/A'}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-2 rounded">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Important</div>
                  <div className="text-lg font-bold">{score.isImportant ? '✅ Yes' : '❌ No'}</div>
                </div>
              </div>

              {/* 計算詳細 */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  計算内訳
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Base Loss:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {detail.baseLoss.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Masked Loss:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {detail.maskedLoss.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Δ Loss:</span>
                    <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">
                      {detail.deltaLoss.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Age Weight:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {detail.ageWeight.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Raw Score:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {detail.rawScore.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Final Score:</span>
                    <span className="font-mono text-green-600 dark:text-green-400 font-bold">
                      {detail.finalScore.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 計算式の説明 */}
              <div className="mt-3 p-2 bg-slate-100 dark:bg-slate-900 rounded text-xs">
                <div className="text-slate-600 dark:text-slate-400 space-y-1">
                  <div>
                    <span className="font-mono">Δ Loss = Masked Loss - Base Loss</span>
                    <span className="ml-2 text-slate-500">= {detail.deltaLoss.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="font-mono">Raw Score = alphaMix × Δ Loss</span>
                    <span className="ml-2 text-slate-500">= {detail.rawScore.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="font-mono">Final Score = Raw Score × Age Weight</span>
                    <span className="ml-2 text-slate-500">= {detail.finalScore.toFixed(4)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
