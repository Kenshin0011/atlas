/**
 * Session Management
 * Supabaseを使った会話セッションの永続化
 */

import type { Utterance } from '@atlas/core';
import type { DependencyEdge, Score } from '@/features/hooks/useStream';
import { supabase } from './client';
import { emailToUsername } from './username';

export type BoothInfo = {
  name: string;
  description?: string;
  experimentParams?: Record<string, unknown>;
};

export type SessionInfo = {
  id: string;
  createdAt: string;
  userId: string | null;
  username: string | null;
  boothName?: string;
  notes?: string;
  experimentParams?: Record<string, unknown>;
};

/**
 * 新しいセッションを作成
 */
export const createSession = async (boothInfo?: BoothInfo): Promise<string> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const username = user?.email ? emailToUsername(user.email) : null;

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: user?.id || null,
      username: username,
      notes: boothInfo?.name || null,
      experiment_params: (boothInfo?.experimentParams as never) || null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
};

/**
 * 発話を保存
 */
export const saveUtterance = async (
  sessionId: string,
  utterance: Utterance,
  userId?: string | null,
  username?: string | null
): Promise<number> => {
  const { data, error } = await supabase
    .from('utterances')
    .insert({
      session_id: sessionId,
      user_id: userId || null,
      username: username || null,
      speaker: utterance.speaker,
      text: utterance.text,
      timestamp: utterance.timestamp,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
};

/**
 * スコアを保存
 */
export const saveScore = async (
  sessionId: string,
  utteranceId: number,
  score: Score
): Promise<void> => {
  // 既存のスコアを確認
  const { data: existing } = await supabase
    .from('scores')
    .select('score')
    .eq('session_id', sessionId)
    .eq('utterance_id', utteranceId)
    .single();

  const existingScore = existing?.score as Score | null;
  const existingIsImportant = existingScore?.isImportant || false;

  const scoreData = {
    ...score,
    // 既存のisImportantがtrueなら保持
    isImportant: existingIsImportant || score.isImportant,
  };

  if (existing) {
    // 更新
    const { error } = await supabase
      .from('scores')
      .update({ score: scoreData as never })
      .eq('session_id', sessionId)
      .eq('utterance_id', utteranceId);

    if (error) throw error;
  } else {
    // 挿入
    const { error } = await supabase.from('scores').insert({
      session_id: sessionId,
      utterance_id: utteranceId,
      score: scoreData as never,
    });

    if (error) throw error;
  }
};

/**
 * 依存関係を保存
 */
export const saveDependencies = async (
  sessionId: string,
  dependencies: Array<{ from: number; to: number }>
): Promise<void> => {
  if (dependencies.length === 0) return;

  const rows = dependencies.map(dep => ({
    session_id: sessionId,
    from_utterance_id: dep.from,
    to_utterance_id: dep.to,
  }));

  const { error } = await supabase.from('dependencies').insert(rows);

  // UNIQUE制約違反（重複）は無視
  if (error && error.code !== '23505') {
    console.error('[saveDependencies] エラー:', error);
    throw error;
  }
};

/**
 * セッション情報を取得
 */
export const getSessionInfo = async (sessionId: string): Promise<SessionInfo> => {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, created_at, user_id, username, notes, experiment_params')
    .eq('id', sessionId)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    createdAt: data.created_at || new Date().toISOString(),
    userId: data.user_id,
    username: data.username,
    boothName: data.notes || undefined,
    notes: data.notes || undefined,
    experimentParams: (data.experiment_params as Record<string, unknown>) || undefined,
  };
};

/**
 * セッションの発話を取得
 */
export const getSessionUtterances = async (sessionId: string): Promise<Utterance[]> => {
  const { data, error } = await supabase
    .from('utterances')
    .select('id, speaker, text, timestamp')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return data.map(row => ({
    id: row.id,
    speaker: row.speaker,
    text: row.text,
    timestamp: row.timestamp,
  }));
};

/**
 * セッションのスコアを取得
 */
export const getSessionScores = async (sessionId: string): Promise<Map<number, Score>> => {
  const { data, error } = await supabase
    .from('scores')
    .select('utterance_id, score')
    .eq('session_id', sessionId);

  if (error) throw error;

  const scoreMap = new Map<number, Score>();
  for (const row of data) {
    scoreMap.set(row.utterance_id, row.score as Score);
  }

  return scoreMap;
};

/**
 * セッションの依存関係を取得
 */
export const getSessionDependencies = async (sessionId: string): Promise<DependencyEdge[]> => {
  const { data, error } = await supabase
    .from('dependencies')
    .select('from_utterance_id, to_utterance_id')
    .eq('session_id', sessionId);

  if (error) throw error;

  return data.map(row => ({
    from: row.from_utterance_id,
    to: row.to_utterance_id,
  }));
};

/**
 * リアルタイム購読：新しい発話
 */
export const subscribeToUtterances = (
  sessionId: string,
  onUtterance: (utterance: Utterance) => void,
  onDelete?: () => void
) => {
  const channel = supabase.channel(`utterances:${sessionId}`);

  // INSERT イベント
  channel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'utterances',
      filter: `session_id=eq.${sessionId}`,
    },
    payload => {
      const row = payload.new;
      onUtterance({
        id: row.id as number,
        speaker: row.speaker as string,
        text: row.text as string,
        timestamp: row.timestamp as number,
      });
    }
  );

  // DELETE イベント（履歴リセット検出用）
  if (onDelete) {
    channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'utterances',
        filter: `session_id=eq.${sessionId}`,
      },
      () => {
        onDelete();
      }
    );
  }

  return channel.subscribe();
};

/**
 * リアルタイム購読：新しいスコア
 */
export const subscribeToScores = (
  sessionId: string,
  onScore: (utteranceId: number, score: Score) => void
) => {
  const channel = supabase.channel(`scores:${sessionId}`);

  // INSERT イベント
  channel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'scores',
      filter: `session_id=eq.${sessionId}`,
    },
    payload => {
      const row = payload.new;
      onScore(row.utterance_id as number, row.score as Score);
    }
  );

  // UPDATE イベント
  channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'scores',
      filter: `session_id=eq.${sessionId}`,
    },
    payload => {
      const row = payload.new;
      onScore(row.utterance_id as number, row.score as Score);
    }
  );

  return channel.subscribe();
};

/**
 * リアルタイム購読：新しい依存関係
 */
export const subscribeToDependencies = (
  sessionId: string,
  onDependency: (edge: DependencyEdge) => void
) => {
  return supabase
    .channel(`dependencies:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'dependencies',
        filter: `session_id=eq.${sessionId}`,
      },
      payload => {
        const row = payload.new;
        onDependency({
          from: row.from_utterance_id as number,
          to: row.to_utterance_id as number,
        });
      }
    )
    .subscribe();
};
