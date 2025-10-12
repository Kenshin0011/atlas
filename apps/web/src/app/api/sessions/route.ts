/**
 * Sessions API Route
 * セッション一覧と統計情報の取得
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export const GET = async (request: NextRequest) => {
  try {
    const supabase = createClient(request);

    // session_statistics ビューから取得
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ sessions: data });
  } catch (error) {
    console.error('Sessions fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
};
