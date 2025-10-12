/**
 * 帰無サンプル生成
 * 統計的有意性検定のための帰無分布構築
 */

import type { Utterance } from '../types';
import type { ModelAdapter } from './adapters/types';
import type { AnalyzerOptions } from './types';
import { shuffle } from './utils/array';

/**
 * 帰無サンプルを生成
 * シャッフルされた履歴から擬似スコアを計算
 * @param adapter モデルアダプタ
 * @param history 会話履歴
 * @param current 現在の発話
 * @param options オプション
 * @returns 帰無スコアの配列
 */
export const generateNullSamples = async (
  adapter: ModelAdapter,
  history: Utterance[],
  current: Utterance,
  options: Required<AnalyzerOptions>
): Promise<number[]> => {
  const nullScores: number[] = [];

  for (let s = 0; s < options.nullSamples; s++) {
    const shuffled = shuffle(history);
    const baseNull = await adapter.lossWithHistory(shuffled, current);
    // 直近k相当を適当に抜粋
    const sample = shuffled.slice(-Math.min(options.k, shuffled.length));

    for (const u of sample) {
      const ml = await adapter.maskedLoss(shuffled, current, u);
      nullScores.push(ml - baseNull);
    }
  }

  return nullScores;
};
