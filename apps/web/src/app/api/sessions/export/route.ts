/**
 * Sessions Export API Route
 * CSV/JSON形式でデータをエクスポート
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export const GET = async (request: NextRequest) => {
  try {
    const supabase = createClient(request);
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const sessionId = searchParams.get('session');

    let query = supabase.from('sessions').select(`
      id,
      created_at,
      username,
      tags,
      notes,
      experiment_params,
      utterance_count,
      important_count,
      avg_score
    `);

    // 特定セッションのみエクスポート
    if (sessionId) {
      query = query.eq('id', sessionId);
    }

    const { data: sessions, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // セッションの詳細データを取得
    const detailedSessions = await Promise.all(
      sessions.map(async session => {
        // 発話データ
        const { data: utterances } = await supabase
          .from('utterances')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true });

        // スコアデータ
        const { data: scores } = await supabase
          .from('ctide_scores')
          .select('*')
          .eq('session_id', session.id);

        return {
          ...session,
          utterances: utterances || [],
          scores: scores || [],
        };
      })
    );

    if (format === 'csv') {
      // CSV形式でエクスポート
      const csv = generateCSV(detailedSessions);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="sessions-${new Date().toISOString()}.csv"`,
        },
      });
    }

    // JSON形式でエクスポート
    return new NextResponse(JSON.stringify(detailedSessions, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="sessions-${new Date().toISOString()}.json"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
};

const generateCSV = (sessions: unknown[]): string => {
  const rows: string[] = [];

  // ヘッダー行
  rows.push(
    [
      'session_id',
      'created_at',
      'username',
      'tags',
      'notes',
      'utterance_count',
      'important_count',
      'avg_score',
      'experiment_params',
    ].join(',')
  );

  // データ行
  for (const session of sessions as Array<{
    id: string;
    created_at: string;
    username: string | null;
    tags: string[] | null;
    notes: string | null;
    utterance_count: number;
    important_count: number;
    avg_score: number;
    experiment_params: unknown;
  }>) {
    rows.push(
      [
        session.id,
        session.created_at,
        session.username || '',
        session.tags?.join(';') || '',
        (session.notes || '').replace(/"/g, '""'),
        session.utterance_count,
        session.important_count,
        session.avg_score,
        JSON.stringify(session.experiment_params || {}),
      ]
        .map(field => `"${field}"`)
        .join(',')
    );
  }

  return rows.join('\n');
};
