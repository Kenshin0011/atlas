/**
 * コア会話分析ロジック
 * 発話の重要度を計算し、統計的に有意なものを抽出
 */

import type { Utterance } from '../types';
import type { ModelAdapter } from './adapters/types';
import { generateNullSamples } from './null-samples';
import { scoreUtterances } from './scoring/scorer';
import type { ScoredUtterance } from './scoring/types';
import { ecdf } from './statistics/fdr';
import { robustZ } from './statistics/robust';
import type { AnalyzerOptions } from './types';
import { defaultOptions } from './types';

/**
 * 会話分析結果
 */
export type AnalyzeResult = {
  /** 統計的に有意な重要発話 */
  important: ScoredUtterance[];
  /** 全発話のスコア */
  scored: ScoredUtterance[];
  /** 帰無スコア（デバッグ用） */
  nullScores: number[];
};

/**
 * 会話を分析し、重要発話を抽出
 * @param adapter モデルアダプタ
 * @param history 会話履歴
 * @param current 現在の発話
 * @param opts オプション
 * @returns 分析結果
 */
export const analyze = async (
  adapter: ModelAdapter,
  history: Utterance[],
  current: Utterance,
  opts: AnalyzerOptions = {}
): Promise<AnalyzeResult> => {
  const o = { ...defaultOptions, ...opts };
  const recent = history.slice(-o.k);
  const baseLoss = await adapter.lossWithHistory(history, current);

  // 候補集合：直近k文
  const candidates = [...recent];

  // 並列処理: スコア計算と帰無サンプル生成を同時実行
  const [details, nullScores] = await Promise.all([
    scoreUtterances(adapter, history, current, candidates, baseLoss, o),
    generateNullSamples(adapter, history, current, o),
  ]);

  // 正規化 → p値化 → BH-FDR
  const finals = details.map(d => d.finalScore);
  const z = robustZ([...finals, ...nullScores]);
  const zFinals = z.slice(0, finals.length);
  const zNull = z.slice(finals.length);
  const F0 = ecdf(zNull);
  const pvals = zFinals.map(v => 1 - F0(v));

  // スコア付き発話を生成
  const scored: ScoredUtterance[] = candidates
    .map((u, i) => ({
      ...u,
      rank: 0,
      score: details[i].finalScore,
      p: pvals[i],
      detail: { ...details[i], pValue: pvals[i] },
    }))
    .sort((a, b) => b.score - a.score);

  // ランク付与
  for (let i = 0; i < scored.length; i++) {
    scored[i].rank = i + 1;
  }

  // 単純なp値による閾値フィルタリング（BH-FDRなし）
  const important = scored.filter(s => s.p !== undefined && s.p < o.fdrAlpha);

  return { important, scored, nullScores };
};
