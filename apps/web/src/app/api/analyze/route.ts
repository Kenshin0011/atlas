/**
 * Analysis API Route
 * Analyzes conversation history and returns important utterances
 */

import {
  AnchorMemory,
  analyzeWithAnchors,
  defaultOptions,
  OpenAIAdapter,
  type Utterance,
} from '@atlas/core';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

// グローバルメモリ（セッション間で共有）
// 本番では Redis/Upstash などに永続化を推奨
const anchorMemory = new AnchorMemory(200);

let adapter: OpenAIAdapter | null = null;

const getAdapter = () => {
  if (!adapter) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    adapter = new OpenAIAdapter({ apiKey });
  }
  return adapter;
};

type RequestBody = {
  history: Utterance[];
  current: Utterance;
  options?: {
    k?: number;
    alphaMix?: number;
    halfLifeTurns?: number;
    nullSamples?: number;
    fdrAlpha?: number;
    mmrLambda?: number;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;
    const { history, current, options = {} } = body;

    // Validation
    if (!Array.isArray(history)) {
      console.error('Invalid history:', history);
      return new Response(
        JSON.stringify({ error: 'Invalid request body: history must be an array' }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    // historyの各要素をバリデーション
    const invalidHistoryItem = history.find(h => !h || !h.text || h.text.trim() === '');
    if (invalidHistoryItem !== undefined) {
      console.error('Invalid history item found:', invalidHistoryItem);
      return new Response(
        JSON.stringify({ error: 'Invalid request body: history contains empty utterances' }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    if (!current) {
      console.error('Invalid current: current is missing');
      return new Response(
        JSON.stringify({ error: 'Invalid request body: current utterance is missing' }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    if (!current.text || current.text.trim() === '') {
      console.error('Invalid current.text:', current);
      return new Response(
        JSON.stringify({ error: 'Invalid request body: current.text is empty' }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    const adapter = getAdapter();

    // 分析実行 (@atlas/core の defaultOptions を使用)
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

    return new Response(
      JSON.stringify({
        important: result.important,
        scored: result.scored,
        anchorCount: anchorMemory.all().length,
      }),
      {
        headers: { 'content-type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Analysis API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
}
