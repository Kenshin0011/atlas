/**
 * ConversationTimeline Component
 * 会話履歴全体を時系列で表示し、重要発言の依存関係を視覚化
 * 途中参加者でも会話の流れと重要なポイントが一目で理解できる
 */

'use client';

import type { Utterance } from '@atlas/core';
import { formatTimeAgo } from '@atlas/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DependencyEdge, Score } from '../hooks/useStream';

type ConversationTimelineProps = {
  dialogue: Utterance[];
  scores: Map<number, Score>;
  dependencies: DependencyEdge[];
  currentUtterance?: Utterance | null;
};

export const ConversationTimeline = ({
  dialogue,
  scores,
  dependencies,
  currentUtterance,
}: ConversationTimelineProps) => {
  const [showOnlyImportant, setShowOnlyImportant] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevDialogueLengthRef = useRef(dialogue.length);

  // 重要発話のリスト
  const importantUtterances = useMemo(() => {
    const important: Utterance[] = [];
    for (const utterance of dialogue) {
      const score = scores.get(utterance.id);
      if (score?.isImportant) {
        important.push(utterance);
      }
    }
    return important;
  }, [dialogue, scores]);

  // 現在の発話が依存している重要発話のIDセット
  const currentDependencies = useMemo(() => {
    if (!currentUtterance) return new Set<number>();

    // 現在の発話を依存先(to)とするエッジの依存元(from)を集める
    const dependencyIds = dependencies
      .filter(edge => edge.to === currentUtterance.id)
      .map(edge => edge.from);

    return new Set(dependencyIds);
  }, [currentUtterance, dependencies]);

  // 表示する発話リスト
  const displayDialogue = useMemo(() => {
    if (showOnlyImportant) {
      return importantUtterances;
    }
    return dialogue;
  }, [showOnlyImportant, importantUtterances, dialogue]);

  // スクロール位置を監視
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 100; // 下から100px以内なら「一番下」とみなす
    const atBottom = scrollHeight - scrollTop - clientHeight < threshold;

    setIsAtBottom(atBottom);
    if (atBottom) {
      setHasNewMessages(false);
    }
  };

  // 一番下にスクロール
  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
    setHasNewMessages(false);
  }, []);

  // 新しい発話が追加されたときの処理
  useEffect(() => {
    if (dialogue.length > prevDialogueLengthRef.current) {
      if (isAtBottom) {
        // 一番下にいる場合は自動スクロール
        setTimeout(() => scrollToBottom(), 100);
      } else {
        // 上の方にいる場合は通知
        setHasNewMessages(true);
      }
    }
    prevDialogueLengthRef.current = dialogue.length;
  }, [dialogue.length, isAtBottom, scrollToBottom]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* ヘッダー */}
      <div className="flex-none px-4 py-2 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              会話タイムライン
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              全 {dialogue.length} 発話
              {importantUtterances.length > 0 && (
                <>
                  {' '}
                  ・ 重要発話{' '}
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    {importantUtterances.length}
                  </span>{' '}
                  件
                </>
              )}
            </p>
          </div>

          {/* フィルタートグル */}
          {importantUtterances.length > 0 && (
            <button
              type="button"
              onClick={() => setShowOnlyImportant(!showOnlyImportant)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                showOnlyImportant
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {showOnlyImportant ? '✓ 重要のみ' : '全て'}
            </button>
          )}
        </div>
      </div>

      {/* サマリーカード（重要発話がある場合） */}
      {importantUtterances.length > 0 && currentDependencies.size > 0 && (
        <div className="flex-none px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>情報</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              💡 {currentDependencies.size}件の関連発話
            </p>
          </div>
        </div>
      )}

      {/* タイムライン */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto px-4 py-3"
        >
          {displayDialogue.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              {showOnlyImportant ? '重要発話がまだありません' : 'まだ発話がありません'}
            </div>
          ) : (
            <div className="space-y-1.5">
              {displayDialogue.map((utterance, _displayIndex) => {
                const score = scores.get(utterance.id);
                const isImportant = score?.isImportant || false;
                const isCurrent = currentUtterance?.id === utterance.id;
                const isDependency = currentDependencies.has(utterance.id);
                const originalIndex = dialogue.findIndex(u => u.id === utterance.id);

                return (
                  <div key={utterance.id} className="relative">
                    {/* 発話カード */}
                    <div
                      className={`rounded p-2 transition-all ${
                        isCurrent
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 dark:border-blue-600'
                          : isDependency
                            ? 'bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-400 dark:border-orange-600'
                            : isImportant
                              ? 'bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-300 dark:border-yellow-700'
                              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {/* ヘッダー */}
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">
                            #{originalIndex + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {utterance.speaker}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-500 text-white rounded-full font-bold">
                              ▶
                            </span>
                          )}
                          {isDependency && !isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-orange-500 text-white rounded-full font-bold animate-pulse">
                              ⭐
                            </span>
                          )}
                          {isImportant && !isDependency && !isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500 text-white rounded-full font-medium">
                              重要
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {formatTimeAgo(utterance.timestamp, Date.now())}
                        </span>
                      </div>

                      {/* 発話テキスト */}
                      <p
                        className={`text-xs leading-snug ${
                          isDependency || isCurrent
                            ? 'text-slate-900 dark:text-slate-50 font-medium'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {utterance.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 新着メッセージ通知 & 一番下に戻るボタン */}
        {hasNewMessages && !isAtBottom && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <button
              type="button"
              onClick={scrollToBottom}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center gap-2 font-medium text-sm transition-all animate-pulse"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <title>下にスクロール</title>
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v10.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              新しい発言があります
            </button>
          </div>
        )}
      </div>

      {/* 凡例 */}
      <div className="flex-none px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50">
        <div className="flex items-center justify-center gap-4 text-[10px] flex-wrap">
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 bg-blue-500 text-white rounded-full font-bold text-[10px]">
              ▶
            </span>
            <span className="text-slate-700 dark:text-slate-300">最新</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 bg-orange-500 text-white rounded-full font-bold text-[10px] animate-pulse">
              ⭐
            </span>
            <span className="text-slate-700 dark:text-slate-300">関連</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 bg-yellow-500 text-white rounded-full text-[10px]">
              重要
            </span>
            <span className="text-slate-700 dark:text-slate-300">その他</span>
          </div>
        </div>
      </div>
    </div>
  );
};
