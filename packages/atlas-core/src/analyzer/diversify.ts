/**
 * MMR多様化
 * Maximal Marginal Relevanceによる結果の多様化
 */

import type { ScoredUtterance } from './scoring/types';
import { cosine } from './utils/math';

/**
 * MMRによる多様化
 * 重要度と多様性のバランスを取りながらk個選択
 * @param items スコア付き発話リスト
 * @param embedder 埋め込み関数
 * @param k 選択数
 * @param lambda 重要度重視度 (0..1、1に近いほど重要度重視)
 * @returns 多様化されたk個の発話
 */
export const mmrDiversify = async (
  items: ScoredUtterance[],
  embedder: (text: string) => Promise<number[]>,
  k: number,
  lambda = 0.7
): Promise<ScoredUtterance[]> => {
  const vecs = await Promise.all(items.map(i => embedder(i.text)));
  const chosen: number[] = [];
  const pool = new Set(items.map((_, idx) => idx));

  while (chosen.length < k && pool.size) {
    let bestIdx = -1;
    let bestScore = -Number.POSITIVE_INFINITY;

    for (const idx of pool) {
      const relevance = items[idx].score;
      let diversity = 0;
      for (const j of chosen) {
        diversity = Math.max(diversity, cosine(vecs[idx], vecs[j]));
      }
      const mmr = lambda * relevance - (1 - lambda) * diversity;

      if (mmr > bestScore) {
        bestScore = mmr;
        bestIdx = idx;
      }
    }

    if (bestIdx === -1) break;
    chosen.push(bestIdx);
    pool.delete(bestIdx);
  }

  return chosen.map(i => items[i]);
};
