/**
 * CTIDE Session Management
 * Supabaseを使った会話セッションの永続化
 */

import type { Utterance } from '@atlas/core';
import type { CtideScore } from '@/features/ctide-assistant/hooks/useCtideStream';
import { supabase } from './client';
import { emailToUsername } from './username';

export type BoothInfo = {
  name: string;
  description?: string;
  experimentParams?: Record<string, unknown>;
  tags?: string[];
};

export type SessionInfo = {
  id: string;
  createdAt: string;
  userId: string | null;
  username: string | null;
  boothName?: string;
  tags?: string[];
  notes?: string;
  experimentParams?: Record<string, unknown>;
};

/**
 * 新しいセッションを作成
 */
export const createSession = async (boothInfo?: BoothInfo): Promise<string> => {
  // 現在のユーザーを取得
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
      tags: boothInfo?.tags || null,
      experiment_params: boothInfo?.experimentParams || null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
};

/**
 * 発話を保存
 */
export const saveUtterance = async (sessionId: string, utterance: Utterance): Promise<number> => {
  // 現在のユーザーを取得
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const username = user?.email ? emailToUsername(user.email) : null;

  const { data, error } = await supabase
    .from('utterances')
    .insert({
      session_id: sessionId,
      user_id: user?.id || null,
      username: username,
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
 * CTIDEスコアを保存
 */
export const saveCtideScore = async (
  sessionId: string,
  utteranceId: number,
  score: CtideScore
): Promise<void> => {
  const { error } = await supabase.from('ctide_scores').insert({
    session_id: sessionId,
    utterance_id: utteranceId,
    score: score as never,
  });

  if (error) throw error;
};

/**
 * セッション情報を取得
 */
export const getSessionInfo = async (sessionId: string): Promise<SessionInfo> => {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, created_at, user_id, username, notes, tags, experiment_params')
    .eq('id', sessionId)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    createdAt: data.created_at,
    userId: data.user_id,
    username: data.username,
    boothName: data.notes || undefined,
    tags: data.tags || undefined,
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
    .select('*')
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
export const getSessionScores = async (sessionId: string): Promise<Map<number, CtideScore>> => {
  const { data, error } = await supabase
    .from('ctide_scores')
    .select('utterance_id, score')
    .eq('session_id', sessionId);

  if (error) throw error;

  const scoreMap = new Map<number, CtideScore>();
  for (const row of data) {
    scoreMap.set(row.utterance_id, row.score as CtideScore);
  }

  return scoreMap;
};

/**
 * リアルタイム購読：新しい発話
 */
export const subscribeToUtterances = (
  sessionId: string,
  onUtterance: (utterance: Utterance) => void
) => {
  return supabase
    .channel(`utterances:${sessionId}`)
    .on(
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
    )
    .subscribe();
};

/**
 * リアルタイム購読：新しいスコア
 */
export const subscribeToScores = (
  sessionId: string,
  onScore: (utteranceId: number, score: CtideScore) => void
) => {
  return supabase
    .channel(`scores:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ctide_scores',
        filter: `session_id=eq.${sessionId}`,
      },
      payload => {
        const row = payload.new;
        onScore(row.utterance_id as number, row.score as CtideScore);
      }
    )
    .subscribe();
};
