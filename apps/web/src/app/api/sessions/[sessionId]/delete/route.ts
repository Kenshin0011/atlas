/**
 * Session Delete API Route
 * セッションを完全削除（セッション + 発話 + スコア）
 */

import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

// Node.js runtimeを使用（環境変数の読み込みのため）
export const runtime = 'nodejs';

type Params = {
  sessionId: string;
};

export async function DELETE(_req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    // Node.js Runtime用のSupabaseクライアント（サービスロール使用）
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // スコアを削除
    const { error: scoresError } = await supabase
      .from('ctide_scores')
      .delete()
      .eq('session_id', sessionId);

    if (scoresError) throw scoresError;

    // 発話を削除
    const { error: utterancesError } = await supabase
      .from('utterances')
      .delete()
      .eq('session_id', sessionId);

    if (utterancesError) throw utterancesError;

    // セッションを削除
    const { error: sessionError } = await supabase.from('sessions').delete().eq('id', sessionId);

    if (sessionError) throw sessionError;

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Session delete error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to delete session',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
}
