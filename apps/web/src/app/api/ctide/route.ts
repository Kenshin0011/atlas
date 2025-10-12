/**
 * CTIDE-Lite API Route
 * Analyzes conversation history and returns important utterances
 */

import {
  AnchorMemory,
  ctideWithAnchors,
  OpenAIAdapter,
  toCTIDEUtterance,
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
    if (!Array.isArray(history) || !current || !current.text) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const adapter = getAdapter();

    // Convert Core Utterances to CTIDE Utterances (id: number -> id: string)
    const ctideHistory = history.map(toCTIDEUtterance);
    const ctideCurrent = toCTIDEUtterance(current);

    // CTIDE-Lite実行
    const result = await ctideWithAnchors(adapter, ctideHistory, ctideCurrent, anchorMemory, {
      k: options.k ?? 6,
      alphaMix: options.alphaMix ?? 0.6,
      halfLifeTurns: options.halfLifeTurns ?? 20,
      nullSamples: options.nullSamples ?? 8,
      fdrAlpha: options.fdrAlpha ?? 0.1,
      mmrLambda: options.mmrLambda ?? 0.7,
    });

    // 重要発言をアンカーメモリに追加
    for (const imp of result.important) {
      anchorMemory.add({
        id: imp.id,
        text: imp.text,
        score: imp.score,
        ts: imp.ts,
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
    console.error('CTIDE API error:', error);
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
