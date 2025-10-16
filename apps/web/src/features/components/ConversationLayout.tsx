/**
 * ConversationLayout Component
 * メイン会話ビュー + 依存関係ミニマップのレイアウト
 */

'use client';

import type { Utterance } from '@atlas/core';
import type { Score } from '../hooks/useStream';
import { ConversationStreamWithDependencies } from './ConversationStreamWithDependencies';

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
  return (
    <ConversationStreamWithDependencies
      dialogue={dialogue}
      scores={scores}
      isAnalyzing={isAnalyzing}
    />
  );
};
