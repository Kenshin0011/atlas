/**
 * スコアリングロジック
 * 発話の重要度スコアを計算
 */

import type { Utterance } from '../../types';
import type { ModelAdapter } from '../adapters/types';
import { timeDecayWeight } from '../statistics/time-decay';
import type { AnalyzerOptions } from '../types';
import type { ScoreDetail } from './types';

/**
 * 発話候補のスコアを計算
 * @param adapter モデルアダプタ
 * @param history 会話履歴
 * @param current 現在の発話
 * @param candidates スコアリング対象の発話リスト
 * @param baseLoss 基準損失
 * @param options オプション
 * @returns スコア詳細の配列
 */
export const scoreUtterances = async (
  adapter: ModelAdapter,
  history: Utterance[],
  current: Utterance,
  candidates: Utterance[],
  baseLoss: number,
  options: Required<AnalyzerOptions>
): Promise<ScoreDetail[]> => {
  // 並列処理: 全候補のmaskedLossを同時に計算
  const maskedLosses = await Promise.all(
    candidates.map(u => adapter.maskedLoss(history, current, u))
  );

  const details: ScoreDetail[] = candidates.map((u, i) => {
    const masked = maskedLosses[i];
    const delta = masked - baseLoss; // 劣化量
    const surpr = 0; // 実装する場合はここで差分を入れる
    const ageTurns = history.length - history.indexOf(u); // 新しいほど小
    const ageW = timeDecayWeight(ageTurns, options.halfLifeTurns);
    const raw = options.alphaMix * delta + (1 - options.alphaMix) * surpr;
    const final = raw * ageW;

    return {
      baseLoss,
      maskedLoss: masked,
      deltaLoss: delta,
      surprisalDelta: surpr,
      ageWeight: ageW,
      rawScore: raw,
      finalScore: final,
    };
  });

  return details;
};
