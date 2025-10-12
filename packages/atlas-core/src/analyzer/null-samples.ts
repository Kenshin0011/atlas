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
  // 並列処理: 各サンプルを同時に生成
  const samplePromises = Array.from({ length: options.nullSamples }, async () => {
    const shuffled = shuffle(history);
    const sample = shuffled.slice(-Math.min(options.k, shuffled.length));

    // baseLossと全maskedLossを並列計算
    const [baseNull, ...maskedLosses] = await Promise.all([
      adapter.lossWithHistory(shuffled, current),
      ...sample.map(u => adapter.maskedLoss(shuffled, current, u)),
    ]);

    return maskedLosses.map(ml => ml - baseNull);
  });

  const allSamples = await Promise.all(samplePromises);
  return allSamples.flat();
};
