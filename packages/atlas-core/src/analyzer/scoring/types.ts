/**
 * スコアリング型定義
 */

import type { Utterance } from '../../types';

/**
 * スコア詳細情報
 * 各発話の重要度計算の内訳
 */
export type ScoreDetail = {
  /** 基準損失 L(Y | H) */
  baseLoss: number;
  /** マスク損失 L(Y | H \ {u}) */
  maskedLoss: number;
  /** 差分損失 D_i = maskedLoss - baseLoss */
  deltaLoss: number;
  /** サプライザル差分（任意） */
  surprisalDelta?: number;
  /** 時間減衰重み e^{-lambda * age} */
  ageWeight: number;
  /** 生スコア（減衰適用前） */
  rawScore: number;
  /** 最終スコア（減衰適用後） */
  finalScore: number;
  /** p値（帰無分布から算出） */
  pValue?: number;
};

/**
 * スコア付き発話
 */
export type ScoredUtterance = Utterance & {
  /** ランク（スコア順位） */
  rank: number;
  /** スコア（finalScore） */
  score: number;
  /** p値 */
  p?: number;
  /** スコア詳細 */
  detail: ScoreDetail;
};
