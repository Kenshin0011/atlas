/**
 * ConversationTimeline Component
 * 会話履歴全体を時系列で表示し、重要発言の依存関係を視覚化
 * 途中参加者でも会話の流れと重要なポイントが一目で理解できる
 */

'use client';

import type { Utterance } from '@atlas/core';
import { formatTimeAgo } from '@atlas/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { saveUserInteractionAction } from '@/app/actions/session';
import type { DependencyEdge, Score } from '../hooks/useStream';

type ConversationTimelineProps = {
  dialogue: Utterance[];
  scores: Map<number, Score>;
  dependencies: DependencyEdge[];
  currentUtterance?: Utterance | null;
  mode?: 'alpha' | 'beta' | 'gamma'; // α版: 依存関係表示, β版: 重要発話のみ, γ版: 要約ボタン
  onSummarize?: () => void; // γ版用: 要約ボタンのコールバック
  summary?: string; // γ版用: 要約テキスト
  summaryLoading?: boolean; // γ版用: 要約読み込み中
  showingSummary?: boolean; // γ版用: 要約表示中かどうか
  sessionId?: string; // イベント記録用
};

export const ConversationTimeline = ({
  dialogue,
  scores,
  dependencies,
  currentUtterance,
  mode = 'alpha',
  onSummarize,
  summary,
  summaryLoading,
  showingSummary,
  sessionId,
}: ConversationTimelineProps) => {
  const isBetaMode = mode === 'beta';
  const isGammaMode = mode === 'gamma';

  // α版・β版ともに初期状態は全て表示
  const [showOnlyRelevant, setShowOnlyRelevant] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevDialogueLengthRef = useRef(dialogue.length);

  // 表示用の依存関係（変更検出用）
  const [displayDependencies, setDisplayDependencies] = useState<Set<number>>(new Set());
  const prevDependenciesRef = useRef<Set<number>>(new Set());

  // 表示用の発話リスト（固定）
  const [displayDialogue, setDisplayDialogue] = useState<Utterance[]>(dialogue);

  // 再帰的に依存関係を辿る関数（共通）
  const getAllDependencies = useCallback(
    (uttId: number, visited = new Set<number>()): number[] => {
      if (visited.has(uttId)) return [];
      visited.add(uttId);

      // この発話に依存している発話を探す
      const directDeps = dependencies.filter(edge => edge.to === uttId).map(edge => edge.from);

      // 再帰的にさらに依存を辿る
      const allDeps: number[] = [];
      for (const depId of directDeps) {
        allDeps.push(depId);
        allDeps.push(...getAllDependencies(depId, visited));
      }

      return allDeps;
    },
    [dependencies]
  );

  // 現在の発話が依存している重要発話のIDセット（再帰的に取得）
  // β版では最新の重要発話のみをオレンジにする
  // α版では過去3発話分の関連語を累積して表示（コロコロ変わるのを防ぐ）
  // γ版では関連語を表示しない（要約ボタンのみ）
  const currentDependencies = useMemo(() => {
    if (isGammaMode) {
      // γ版：関連語を表示しない
      return new Set<number>();
    }

    if (isBetaMode) {
      // β版：最新の重要発話のみをオレンジ色で表示（現在の関連語）
      const importantUtterances = dialogue.filter(u => scores.get(u.id)?.isImportant);
      if (importantUtterances.length === 0) return new Set<number>();

      // 最新の重要発話のみ
      const latestImportant = importantUtterances[importantUtterances.length - 1];
      return new Set([latestImportant.id]);
    }

    // α版：過去3発話分の依存関係を累積（情報量を抑える）
    const recentUtterances = dialogue.slice(-3); // 最新3発話
    const depWithScore: Array<{ id: number; score: number; age: number }> = [];
    const seenIds = new Set<number>();

    console.log('[ConversationTimeline] Accumulating dependencies for recent utterances:', {
      count: recentUtterances.length,
      ids: recentUtterances.map(u => u.id),
    });

    // 各発話の依存関係を収集（スコアと新しさを記録）
    for (let i = 0; i < recentUtterances.length; i++) {
      const utt = recentUtterances[i];
      const age = recentUtterances.length - 1 - i; // 0: 最新, 2: 最古
      const deps = getAllDependencies(utt.id);

      console.log(`[ConversationTimeline] Dependencies for utterance ${utt.id}:`, deps);

      for (const dep of deps) {
        if (!seenIds.has(dep)) {
          seenIds.add(dep);
          const score = scores.get(dep);
          depWithScore.push({
            id: dep,
            score: score?.score || 0,
            age,
          });
        }
      }
    }

    // スコアと新しさでソートして上位5個まで（情報量を制限）
    const topDeps = depWithScore
      .sort((a, b) => {
        // スコアが高い順、同じなら新しい順
        if (b.score !== a.score) return b.score - a.score;
        return a.age - b.age;
      })
      .slice(0, 5)
      .map(d => d.id);

    console.log('[ConversationTimeline] Top dependencies (max 5):', topDeps);

    return new Set(topDeps);
  }, [isGammaMode, isBetaMode, dialogue, scores, getAllDependencies]);

  // 依存関係が変わったときだけ表示を更新
  useEffect(() => {
    // 依存関係の変更を検出（β版では常に空）
    const hasChanged =
      currentDependencies.size !== prevDependenciesRef.current.size ||
      Array.from(currentDependencies).some(id => !prevDependenciesRef.current.has(id));

    if (hasChanged) {
      console.log('[ConversationTimeline] Dependencies changed, updating display');
      setDisplayDependencies(new Set(currentDependencies));
      prevDependenciesRef.current = new Set(currentDependencies);

      // displayDialogueも更新
      if (showOnlyRelevant) {
        const relevantIds = new Set([
          ...(currentUtterance ? [currentUtterance.id] : []),
          ...currentDependencies, // β版では空なのでcurrentUtteranceのみ
        ]);

        setDisplayDialogue(dialogue.filter(u => relevantIds.has(u.id)));
      }
    } else {
      console.log('[ConversationTimeline] Dependencies unchanged, keeping display');
    }
  }, [currentDependencies, dialogue, currentUtterance, showOnlyRelevant]);

  // 「全て」モードではdialogueの変更を反映
  useEffect(() => {
    if (!showOnlyRelevant) {
      setDisplayDialogue(dialogue);
    }
  }, [dialogue, showOnlyRelevant]);

  // フィルタートグルが変更されたとき
  const prevShowOnlyRelevantRef = useRef(showOnlyRelevant);
  useEffect(() => {
    // showOnlyRelevantが実際に変わったときだけ実行
    if (prevShowOnlyRelevantRef.current !== showOnlyRelevant) {
      prevShowOnlyRelevantRef.current = showOnlyRelevant;

      if (showOnlyRelevant) {
        // 関連のみモードに切り替え：現在のdisplayDependenciesでフィルタ（β版では空）
        const relevantIds = new Set([
          ...(currentUtterance ? [currentUtterance.id] : []),
          ...displayDependencies, // β版では空なのでcurrentUtteranceのみ
        ]);

        setDisplayDialogue(dialogue.filter(u => relevantIds.has(u.id)));
      } else {
        // 全てモードに切り替え：全て表示
        setDisplayDialogue(dialogue);
      }
    }
  }, [showOnlyRelevant, currentUtterance, displayDependencies, dialogue]);

  // 依存関係チェーンを構築（例: #5→#4→#1）（β版・γ版では非表示）
  const dependencyChain = useMemo(() => {
    if (isBetaMode || isGammaMode) return null; // β版・γ版では依存関係チェーンを表示しない
    if (!currentUtterance || currentDependencies.size === 0) return null;

    console.log('[ConversationTimeline] Building dependency chain:', {
      currentUtterance: currentUtterance.id,
      currentDependencies: Array.from(currentDependencies),
    });

    // 発話順にソート（古い順）
    const sortedDeps = Array.from(currentDependencies)
      .map(id => dialogue.find(u => u.id === id))
      .filter((u): u is Utterance => u !== undefined)
      .sort((a, b) => {
        const indexA = dialogue.findIndex(u => u.id === a.id);
        const indexB = dialogue.findIndex(u => u.id === b.id);
        return indexA - indexB;
      });

    // 発話番号のリストを作成
    const chain = sortedDeps.map(u => dialogue.findIndex(d => d.id === u.id) + 1);
    const currentIndex = dialogue.findIndex(d => d.id === currentUtterance.id) + 1;

    console.log('[ConversationTimeline] Dependency chain result:', {
      chain,
      currentIndex,
    });

    return { chain, currentIndex };
  }, [isBetaMode, isGammaMode, currentUtterance, currentDependencies, dialogue]);

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
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              会話タイムライン
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              全 {dialogue.length} 発話
              {displayDependencies.size > 0 && (
                <>
                  {' '}
                  ・ 関連{' '}
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    {displayDependencies.size}
                  </span>{' '}
                  件
                </>
              )}
            </p>
            {/* 依存関係チェーン表示（α版のみ） */}
            {!isBetaMode && dependencyChain && (
              <div className="mt-2 flex items-center gap-1 text-xs">
                <span className="text-slate-500 dark:text-slate-400">依存:</span>
                <div className="flex items-center gap-1 font-mono font-semibold">
                  {dependencyChain.chain.map((num, idx) => (
                    <span key={num} className="flex items-center gap-1">
                      <span className="text-orange-600 dark:text-orange-400">#{num}</span>
                      {idx < dependencyChain.chain.length - 1 && (
                        <span className="text-slate-400">→</span>
                      )}
                    </span>
                  ))}
                  <span className="text-slate-400">→</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    #{dependencyChain.currentIndex}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* コントロールボタン */}
          <div className="flex items-center gap-2">
            {/* フィルタートグル（α版・β版のみ） */}
            {!isGammaMode && (
              <button
                type="button"
                onClick={() => {
                  const newState = !showOnlyRelevant;
                  setShowOnlyRelevant(newState);
                  // イベント記録
                  console.log(
                    '[ConversationTimeline] Filter toggle clicked, sessionId:',
                    sessionId
                  );
                  if (sessionId) {
                    console.log('[ConversationTimeline] Calling saveUserInteractionAction');
                    saveUserInteractionAction(sessionId, 'filter_toggle', {
                      filter_state: newState ? 'relevant' : 'all',
                    });
                  } else {
                    console.warn(
                      '[ConversationTimeline] sessionId is undefined, cannot save interaction'
                    );
                  }
                }}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  showOnlyRelevant
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {showOnlyRelevant ? '✓ 関連のみ' : '全て'}
              </button>
            )}

            {/* 要約ボタン（γ版のみ） */}
            {isGammaMode && onSummarize && (
              <button
                type="button"
                onClick={onSummarize}
                className={`px-4 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  showingSummary
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>📝</span>
                <span>{showingSummary ? '✓ 要約' : '要約'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* タイムライン */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto px-4 py-3"
        >
          {/* γ版：要約表示 */}
          {isGammaMode && showingSummary ? (
            <div className="max-w-3xl mx-auto">
              {summaryLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">要約を生成中...</p>
                </div>
              ) : summary ? (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <span>📝</span>
                    <span>会話の要約</span>
                  </h3>
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
                      {summary}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  要約が生成されませんでした
                </div>
              )}
            </div>
          ) : displayDialogue.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              {showOnlyRelevant ? '関連発話がありません' : 'まだ発話がありません'}
            </div>
          ) : (
            <div className="space-y-1.5">
              {displayDialogue.map((utterance, _displayIndex) => {
                const isCurrent = currentUtterance?.id === utterance.id;
                const isDependency = displayDependencies.has(utterance.id);
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
        </div>
      </div>
    </div>
  );
};
