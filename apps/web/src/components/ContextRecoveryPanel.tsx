'use client';

import type { Dependency, Utterance } from '@atlas/core';
import { formatTimeAgo } from '@atlas/core';

export type ContextRecoveryData = {
  targetUtterance: Utterance;
  dependencies: Array<{
    dependency: Dependency;
    utterance: Utterance;
  }>;
  summary?: string;
};

type ContextRecoveryPanelProps = {
  data: ContextRecoveryData;
  onClose: () => void;
};

export const ContextRecoveryPanel = ({ data, onClose }: ContextRecoveryPanelProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              🤔 今なんの話?
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              この発言を理解するために必要な文脈
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg p-2 transition-colors"
            aria-label="閉じる"
          >
            <svg
              className="w-6 h-6 text-slate-600 dark:text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              role="img"
              aria-label="閉じる"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 現在の発言 */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border-l-4 border-amber-500">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl" role="img" aria-label="ターゲット">
                🎯
              </span>
              <span className="font-bold text-amber-800 dark:text-amber-400">現在の発言</span>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              {data.targetUtterance.speaker} •{' '}
              {formatTimeAgo(data.targetUtterance.timestamp, Date.now())}
            </div>
            <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
              {data.targetUtterance.text}
            </p>
          </div>

          {/* 依存関係がない場合 */}
          {data.dependencies.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <span className="text-4xl mb-2 block" role="img" aria-label="OK">
                ✅
              </span>
              <p className="font-medium">この発言は独立しています</p>
              <p className="text-sm mt-1">過去の文脈なしで理解できます</p>
            </div>
          ) : (
            <>
              {/* 依存関係の説明 */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl" role="img" aria-label="リンク">
                    🔗
                  </span>
                  <span className="font-semibold text-blue-800 dark:text-blue-400">
                    {data.dependencies.length}件の関連発言
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  この発言を理解するには、以下の過去の発言が必要です
                </p>
              </div>

              {/* 依存先の発言リスト（時系列順） */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">
                  関連発言（時系列）
                </h3>
                {data.dependencies
                  .sort((a, b) => a.utterance.id - b.utterance.id)
                  .map(({ dependency, utterance }) => {
                    const distance = data.targetUtterance.id - utterance.id;
                    const weightPercent = Math.round(dependency.weight * 100);

                    return (
                      <div
                        key={utterance.id}
                        className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600"
                      >
                        {/* ヘッダー */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {utterance.speaker}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {formatTimeAgo(utterance.timestamp, Date.now())}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              ({distance}発言前)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-medium">
                              {dependency.type === 'local' && '短期'}
                              {dependency.type === 'topic' && '話題'}
                              {dependency.type === 'global' && '伏線'}
                            </span>
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              関連度 {weightPercent}%
                            </span>
                          </div>
                        </div>

                        {/* 発言内容 */}
                        <p className="text-slate-800 dark:text-slate-200">{utterance.text}</p>

                        {/* 共有エンティティ（topicの場合） */}
                        {dependency.evidence?.shared_entities && (
                          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                              共通のキーワード:{' '}
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {dependency.evidence.shared_entities.join(', ')}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </div>

        {/* フッター */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
