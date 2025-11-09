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
  /** z値閾値（この値以上を重要とみなす） */
  zThreshold?: number;
};

/**
 * デフォルトオプション
 */
export const defaultOptions: Required<AnalyzerOptions> = {
  k: 15,
  halfLifeTurns: 50, // 50ターンで半減（大幅に緩和）
  nullSamples: 20,
  zThreshold: 1.0, // z > 1.0 を重要とみなす
};
