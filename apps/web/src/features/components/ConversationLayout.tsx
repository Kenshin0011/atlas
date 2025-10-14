/**
 * ConversationLayout Component
 * メイン会話ビュー + 依存関係ミニマップのレイアウト
 */

'use client';

import type { Utterance } from '@atlas/core';
import { useState } from 'react';
import type { Score } from '../hooks/useStream';
import { ConversationStreamWithDependencies } from './ConversationStreamWithDependencies';
import { DependencyMinimap } from './DependencyMinimap';

type ConversationLayoutProps = {
  dialogue: Utterance[];
  scores: Map<number, Score>;
  isAnalyzing?: boolean;
};

export const ConversationLayout = ({
  dialogue,
  scores,
  isAnalyzing = false,
}: ConversationLayoutProps) => {
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [highlightedIds, setHighlightedIds] = useState<number[]>([]);

  // 発話クリック時のハンドラ
  const handleUtteranceClick = (utterance: Utterance) => {
    setSelectedId(utterance.id);

    // 依存関係をハイライト
    // 簡易実装：前後の重要発話をハイライト
    const importantIds = Array.from(scores.values())
      .filter(s => s.isImportant)
      .map(s => s.utteranceId)
      .sort((a, b) => a - b);

    const currentIndex = importantIds.indexOf(utterance.id);
    if (currentIndex >= 0) {
      const highlights: number[] = [utterance.id];

      // 前の重要発話
      if (currentIndex > 0) {
        highlights.push(importantIds[currentIndex - 1]);
      }

      // 次の重要発話
      if (currentIndex < importantIds.length - 1) {
        highlights.push(importantIds[currentIndex + 1]);
      }

      setHighlightedIds(highlights);

      // 3秒後にハイライトを解除
      setTimeout(() => {
        setHighlightedIds([]);
      }, 3000);
    }
  };

  // ミニマップのノードクリック時のハンドラ
  const handleMinimapNodeClick = (id: number) => {
    setSelectedId(id);
    setHighlightedIds([id]);

    // 該当発話までスクロール
    const element = document.querySelector(`[data-utterance-id="${id}"]`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 3秒後にハイライトを解除
    setTimeout(() => {
      setHighlightedIds([]);
    }, 3000);
  };

  return (
    <div className="flex gap-4 h-full">
      {/* メイン: 会話ストリーム */}
      <div className="flex-1 min-w-0">
        <ConversationStreamWithDependencies
          dialogue={dialogue}
          scores={scores}
          onUtteranceClick={handleUtteranceClick}
          isAnalyzing={isAnalyzing}
          highlightedIds={highlightedIds}
        />
      </div>

      {/* サイド: 依存関係ミニマップ */}
      <div className="w-80 flex-shrink-0">
        <DependencyMinimap
          dialogue={dialogue}
          scores={scores}
          currentId={selectedId}
          onNodeClick={handleMinimapNodeClick}
        />
      </div>
    </div>
  );
};
