'use client';

import type { SCAINResult, Utterance } from '@atlas/core';
import { formatTimeAgo } from '@atlas/core';
import { Badge, Card } from '@atlas/ui';

type ConversationViewProps = {
  dialogue: Utterance[];
  scainResults: Map<number, SCAINResult>;
  onUtteranceClick?: (utterance: Utterance) => void;
  importantOnlyMode?: boolean;
};

export function ConversationView({
  dialogue,
  scainResults,
  onUtteranceClick,
  importantOnlyMode = false,
}: ConversationViewProps) {
  if (dialogue.length === 0) {
    return (
      <Card variant="elevated" padding="lg" className="text-center">
        <div className="text-slate-400 dark:text-slate-500">
          <svg
            className="w-16 h-16 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            role="img"
            aria-label="マイク"
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
      </Card>
    );
  }

  // フィルタリング
  const filteredDialogue = importantOnlyMode
    ? dialogue.filter(utt => scainResults.get(utt.id)?.is_scain)
    : dialogue;

  return (
    <Card variant="elevated" padding="lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">会話履歴</h2>
        {importantOnlyMode && (
          <span className="text-sm text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
            <span role="img" aria-label="フィルタ">
              ⭐
            </span>
            重要な発言のみ表示中
          </span>
        )}
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {filteredDialogue.map(utterance => {
          const scainResult = scainResults.get(utterance.id);
          const isSCAIN = scainResult?.is_scain;

          return (
            <button
              type="button"
              key={utterance.id}
              onClick={() => onUtteranceClick?.(utterance)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onUtteranceClick?.(utterance);
                }
              }}
              className={`w-full text-left p-4 rounded-lg transition-all ${
                isSCAIN
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500'
                  : 'bg-slate-50 dark:bg-slate-700/50'
              } ${onUtteranceClick ? 'cursor-pointer hover:shadow-md' : ''}`}
              disabled={!onUtteranceClick}
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
                    <Badge variant="warning">🔗 依存あり</Badge>
                  </div>
                )}
              </div>

              {/* 発言内容 */}
              <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{utterance.text}</p>

              {/* SCAIN詳細 */}
              {scainResult && isSCAIN && (
                <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
                  <div className="text-xs space-y-2">
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
                          className="bg-amber-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${scainResult.importance_score * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-slate-700 dark:text-slate-300">
                        {Math.round(scainResult.importance_score * 100)}%
                      </span>
                    </div>
                    {/* 依存先の発言プレビュー */}
                    {scainResult.dependencies.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                        <span className="text-slate-600 dark:text-slate-400 block mb-1">
                          参照している発言:
                        </span>
                        <div className="space-y-1">
                          {scainResult.dependencies.slice(0, 2).map(dep => {
                            const refUtterance = dialogue.find(u => u.id === dep.id);
                            if (!refUtterance) return null;
                            return (
                              <div
                                key={dep.id}
                                className="text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50 rounded px-2 py-1"
                              >
                                <span className="font-medium">{refUtterance.speaker}:</span>{' '}
                                {refUtterance.text.slice(0, 30)}
                                {refUtterance.text.length > 30 && '...'}
                              </div>
                            );
                          })}
                          {scainResult.dependencies.length > 2 && (
                            <div className="text-slate-500 dark:text-slate-400 italic">
                              他 {scainResult.dependencies.length - 2} 件
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
