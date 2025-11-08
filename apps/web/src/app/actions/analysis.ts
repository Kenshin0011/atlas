/**
 * Analysis Server Actions
 * 会話分析のServer Actions（最適化版）
 */

'use server';

import type { Utterance } from '@atlas/core';
import { type AnalysisResult, analyzeConversation } from '@/lib/services/analysis';

type AnalysisOptions = {
  k?: number;
  halfLifeTurns?: number;
  nullSamples?: number;
  fdrAlpha?: number;
};

/**
 * 会話を分析するServer Action（最適化版）
 * Zodバリデーションを削除してパフォーマンスを向上
 */
export const analyzeConversationAction = async (
  history: Utterance[],
  current: Utterance,
  options?: AnalysisOptions
): Promise<AnalysisResult> => {
  try {
    // 最小限のバリデーション（空チェックのみ）
    if (!current?.text?.trim()) {
      throw new Error('Current utterance text is required');
    }

    // ビジネスロジック実行
    const result = await analyzeConversation(history, current, options);

    return result;
  } catch (error) {
    console.error('[analyzeConversationAction] Error:', error);
    throw new Error(error instanceof Error ? error.message : 'Unknown error');
  }
};
