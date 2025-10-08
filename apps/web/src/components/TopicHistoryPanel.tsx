'use client';

import type { Utterance } from '@atlas/core';
import { formatTimeAgo } from '@atlas/core';
import { useMemo } from 'react';
import { extractNouns } from '@/utils/textProcessing';

type TopicSegment = {
  topicKeywords: string[];
  startId: number;
  endId: number;
  utterances: Utterance[];
  label: string;
};

type TopicHistoryPanelProps = {
  dialogue: Utterance[];
  onClose: () => void;
};

export const TopicHistoryPanel = ({ dialogue, onClose }: TopicHistoryPanelProps) => {
  // 話題のセグメント化（簡易版）
  const topicSegments = useMemo(() => {
    if (dialogue.length === 0) return [];

    const segments: TopicSegment[] = [];
    let currentSegment: TopicSegment | null = null;

    for (const utterance of dialogue) {
      const nouns = extractNouns(utterance.text);

      if (!currentSegment) {
        // 最初のセグメント
        currentSegment = {
          topicKeywords: nouns,
          startId: utterance.id,
          endId: utterance.id,
          utterances: [utterance],
          label: nouns[0] || '雑談',
        };
      } else {
        // 前のセグメントとの類似度を計算
        const prevKeywords = new Set(currentSegment.topicKeywords);
        const overlap = nouns.filter(n => prevKeywords.has(n));
        const similarity =
          overlap.length / Math.max(nouns.length, currentSegment.topicKeywords.length, 1);

        if (similarity > 0.3) {
          // 話題継続
          currentSegment.endId = utterance.id;
          currentSegment.utterances.push(utterance);
          // キーワードをマージ
          currentSegment.topicKeywords = [
            ...new Set([...currentSegment.topicKeywords, ...nouns]),
          ].slice(0, 5);
        } else {
          // 話題変更
          segments.push(currentSegment);
          currentSegment = {
            topicKeywords: nouns,
            startId: utterance.id,
            endId: utterance.id,
            utterances: [utterance],
            label: nouns[0] || '雑談',
          };
        }
      }
    }

    if (currentSegment) {
      segments.push(currentSegment);
    }

    return segments;
  }, [dialogue]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">📊 話題の流れ</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              会話の中で話題がどのように変化したか
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
        <div className="flex-1 overflow-y-auto p-6">
          {topicSegments.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <span className="text-4xl mb-2 block" role="img" aria-label="なし">
                📭
              </span>
              <p>まだ会話がありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* タイムライン */}
              <div className="relative">
                {topicSegments.map((segment, i) => {
                  const isLast = i === topicSegments.length - 1;
                  const duration = segment.utterances.length;
                  const colors = [
                    'bg-blue-500',
                    'bg-green-500',
                    'bg-purple-500',
                    'bg-pink-500',
                    'bg-yellow-500',
                  ];
                  const color = colors[i % colors.length];

                  return (
                    <div key={segment.startId} className="flex gap-4 mb-6">
                      {/* タイムライン */}
                      <div className="flex flex-col items-center">
                        <div className={`w-4 h-4 rounded-full ${color} flex-shrink-0`} />
                        {!isLast && (
                          <div className="w-0.5 h-full bg-slate-300 dark:bg-slate-600 flex-grow mt-2" />
                        )}
                      </div>

                      {/* セグメント詳細 */}
                      <div className="flex-1 pb-4">
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                          {/* ヘッダー */}
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                              話題 {i + 1}: {segment.label}
                            </h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {duration}発言
                            </span>
                          </div>

                          {/* キーワード */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {segment.topicKeywords.slice(0, 5).map(keyword => (
                              <span
                                key={keyword}
                                className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>

                          {/* 発言サマリー */}
                          <details className="text-sm">
                            <summary className="cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                              発言を見る ({segment.utterances.length}件)
                            </summary>
                            <div className="mt-3 space-y-2 ml-4">
                              {segment.utterances.map(utt => (
                                <div
                                  key={utt.id}
                                  className="text-slate-700 dark:text-slate-300 border-l-2 border-slate-300 dark:border-slate-600 pl-3"
                                >
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                                    {utt.speaker} • {formatTimeAgo(utt.timestamp, Date.now())}
                                  </div>
                                  <div>{utt.text}</div>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
