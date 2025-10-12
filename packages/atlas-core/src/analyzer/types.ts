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
  /** 損失/サプライザルの混合比 (0..1) */
  alphaMix?: number;
  /** 何発話で半減させるか */
  halfLifeTurns?: number;
  /** 帰無サンプル数 */
  nullSamples?: number;
  /** BHのFDR閾値 */
  fdrAlpha?: number;
  /** 短文統合の閾値（トークン数相当、ざっくり） */
  minTokensForSingle?: number;
  /** 多様化強度 (0..1) */
  mmrLambda?: number;
};

/**
 * デフォルトオプション
 */
export const defaultOptions: Required<AnalyzerOptions> = {
  k: 6,
  alphaMix: 0.6,
  halfLifeTurns: 20,
  nullSamples: 8,
  fdrAlpha: 0.1,
  minTokensForSingle: 5,
  mmrLambda: 0.7,
};
