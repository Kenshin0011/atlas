/**
 * Conversation Analyzer
 * 会話分析ライブラリ - 学習なし・リアルタイム実装
 *
 * 機能:
 * - 直近k文のΔスコア算出
 * - 帰無分布からp値化 → BH-FDR
 * - 時間減衰、MMR多様化、重要アンカーメモリ
 * - LLM適合の抽象アダプタ（loss, maskedLoss, embed）
 */

// ==================== アダプタ ====================
export type { ModelAdapter, OpenAIAdapterConfig } from './adapters';
export { CosineFallbackAdapter, OpenAIAdapter } from './adapters';
export { analyzeWithAnchors } from './analyze-with-anchors';
export type { AnalyzeResult } from './analyzer';
// ==================== コア分析関数 ====================
export { analyze } from './analyzer';
export type { Anchor } from './anchor-memory';
// ==================== アンカーメモリ ====================
export { AnchorMemory } from './anchor-memory';
// ==================== ユーティリティ ====================
// MMR多様化
export { mmrDiversify } from './diversify';
// 帰無サンプル生成
export { generateNullSamples } from './null-samples';
// スコアリング
export { scoreUtterances } from './scoring/scorer';
export type { ScoreDetail, ScoredUtterance } from './scoring/types';
export { benjaminiHochberg, ecdf } from './statistics/fdr';
// ==================== ユーティリティ ====================
// 統計
export { median, robustZ } from './statistics/robust';
export { timeDecayWeight } from './statistics/time-decay';
// ==================== 型定義 ====================
export type { AnalyzerOptions } from './types';
export { defaultOptions } from './types';
export { shuffle } from './utils/array';
// 数学
export { cosine } from './utils/math';
