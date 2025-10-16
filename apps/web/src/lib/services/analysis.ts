/**
 * Analysis Service
 * 会話分析のビジネスロジック
 */

import {
  AnchorMemory,
  analyzeWithAnchors,
  defaultOptions,
  OpenAIAdapter,
  type Utterance,
} from '@atlas/core';

// グローバルメモリ（セッション間で共有）
// 本番では Redis/Upstash などに永続化を推奨
const anchorMemory = new AnchorMemory(200);

let adapter: OpenAIAdapter | null = null;

const getAdapter = (): OpenAIAdapter => {
  if (!adapter) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    adapter = new OpenAIAdapter({ apiKey });
  }
  return adapter;
};

export type AnalysisOptions = {
  k?: number;
  alphaMix?: number;
  halfLifeTurns?: number;
  nullSamples?: number;
  fdrAlpha?: number;
  mmrLambda?: number;
};

export type AnalysisResult = {
  important: Array<{
    id: number;
    text: string;
    score: number;
    rank: number;
    p?: number;
    timestamp: number;
    detail: {
      baseLoss: number;
      maskedLoss: number;
      deltaLoss: number;
      ageWeight: number;
      rawScore: number;
      finalScore: number;
    };
  }>;
  scored: Array<{
    id: number;
    text: string;
    score: number;
    rank: number;
    p?: number;
    detail: {
      baseLoss: number;
      maskedLoss: number;
      deltaLoss: number;
      ageWeight: number;
      rawScore: number;
      finalScore: number;
    };
  }>;
  anchorCount: number;
};

/**
 * 会話履歴を分析
 */
export const analyzeConversation = async (
  history: Utterance[],
  current: Utterance,
  options: AnalysisOptions = {}
): Promise<AnalysisResult> => {
  const adapter = getAdapter();

  // 分析実行
  const result = await analyzeWithAnchors(adapter, history, current, anchorMemory, {
    k: options.k ?? defaultOptions.k,
    alphaMix: options.alphaMix ?? defaultOptions.alphaMix,
    halfLifeTurns: options.halfLifeTurns ?? defaultOptions.halfLifeTurns,
    nullSamples: options.nullSamples ?? defaultOptions.nullSamples,
    fdrAlpha: options.fdrAlpha ?? defaultOptions.fdrAlpha,
    mmrLambda: options.mmrLambda ?? defaultOptions.mmrLambda,
  });

  // 重要発言をアンカーメモリに追加
  for (const imp of result.important) {
    anchorMemory.add({
      id: imp.id,
      text: imp.text,
      score: imp.score,
      ts: imp.timestamp,
    });
  }

  return {
    important: result.important,
    scored: result.scored,
    anchorCount: anchorMemory.all().length,
  };
};

/**
 * アンカーメモリのサイズを取得
 */
export const getAnchorMemorySize = (): number => {
  return anchorMemory.all().length;
};
