/**
 * Analyzer型定義
 * 会話分析の設定と結果型
 */

// Utterance型は ../types.ts からインポートして使用

/**
 * Analyzer設定オプション
 */
export type AnalyzerOptions = {
  /** 直近k文の厳密評価 */
  k?: number;
  /** 何発話で半減させるか */
  halfLifeTurns?: number;
  /** 帰無サンプル数 */
  nullSamples?: number;
  /** BHのFDR閾値 */
  fdrAlpha?: number;
  /** 個別損失と集合損失のミックス係数（0-1, デフォルト0.5） */
  individualMix?: number;
};

/**
 * デフォルトオプション
 */
export const defaultOptions: Required<AnalyzerOptions> = {
  k: 15,
  halfLifeTurns: 50, // 50ターンで半減（大幅に緩和）
  nullSamples: 20,
  fdrAlpha: 0.1,
  individualMix: 0.5, // 個別損失50%、集合損失50%
};
