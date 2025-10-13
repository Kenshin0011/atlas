/**
 * Session Detail API Route
 * セッションの詳細情報（発話リスト）を取得
 */

import type { NextRequest } from 'next/server';
import { getSessionUtterances } from '@/lib/supabase/session';

export const runtime = 'nodejs';

type Params = {
  sessionId: string;
};

export async function GET(_req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const utterances = await getSessionUtterances(sessionId);

    return new Response(
      JSON.stringify({
        utterances,
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Session detail error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch session detail',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
}
