'use client';

import type { Dependency, Utterance } from '@atlas/core';
import { formatTimeAgo } from '@atlas/core';
import { Badge, Button, Modal } from '@atlas/ui';

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
    <Modal isOpen={true} onClose={onClose} title="🤔 今なんの話?" maxWidth="2xl">
      <div className="space-y-6">
        {/* ヘッダー説明 */}
        <p className="text-sm text-slate-600 dark:text-slate-400 -mt-2">
          この発言を理解するために必要な文脈
        </p>
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
                          <Badge variant="info">
                            {dependency.type === 'local' && '短期'}
                            {dependency.type === 'topic' && '話題'}
                            {dependency.type === 'global' && '伏線'}
                          </Badge>
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

        {/* フッター */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
          <Button variant="primary" onClick={onClose} className="w-full">
            閉じる
          </Button>
        </div>
      </div>
    </Modal>
  );
};
