/**
 * Session Scores API Route
 * セッションのスコア情報を取得
 */

import type { NextRequest } from 'next/server';
import { getSessionScores } from '@/lib/supabase/session';

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

    const scores = await getSessionScores(sessionId);

    return new Response(
      JSON.stringify({
        count: scores.size,
        scores: Array.from(scores.entries()).map(([_id, score]) => ({
          ...score,
        })),
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Session scores error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch session scores',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
}
