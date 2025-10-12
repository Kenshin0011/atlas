/**
 * アンカー統合分析
 * 重要アンカーを考慮した会話分析
 */

import type { Utterance } from '../types';
import type { ModelAdapter } from './adapters/types';
import type { AnalyzeResult } from './analyzer';
import { analyze } from './analyzer';
import type { AnchorMemory } from './anchor-memory';
import type { AnalyzerOptions } from './types';
import { cosine } from './utils/math';

/**
 * アンカーメモリを統合した会話分析
 * 既存の重要発話との類似度でスコアをブースト
 * @param adapter モデルアダプタ
 * @param history 会話履歴
 * @param current 現在の発話
 * @param anchorMemory アンカーメモリ
 * @param opts オプション
 * @returns 分析結果
 */
export const analyzeWithAnchors = async (
  adapter: ModelAdapter,
  history: Utterance[],
  current: Utterance,
  anchorMemory: AnchorMemory,
  opts: AnalyzerOptions = {}
): Promise<AnalyzeResult> => {
  const base = await analyze(adapter, history, current, opts);

  // アンカー上位Nも候補に含めて再評価（軽量版：コサイン類似でブースト）
  const anchors = anchorMemory.top(10);
  if (anchors.length) {
    const [yVec, ...aVecs] = await Promise.all([
      adapter.embed(current.text),
      ...anchors.map(a => adapter.embed(a.text)),
    ]);
    const boost = anchors.map((a, i) => ({ a, sim: cosine(aVecs[i], yVec) }));

    // ブーストは擬似的に finalScore へ加算
    const boosted = base.scored.map(s => ({ ...s }));
    for (const b of boost) {
      // アンカーに近いテキストは+sim*0.2 を加点
      for (const s of boosted) {
        s.score += 0.2 * b.sim;
      }
    }

    boosted.sort((x, y) => y.score - x.score);

    // ランク付与
    for (let i = 0; i < boosted.length; i++) {
      boosted[i].rank = i + 1;
    }

    return { ...base, scored: boosted };
  }

  return base;
};
