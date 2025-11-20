/**
 * Session Server Actions
 * セッション管理のServer Actions（最適化版）
 */

'use server';

import type { Utterance } from '@atlas/core';
import type { DependencyEdge, Score } from '@/features/hooks/useStream';
import { createServerActionClient, createServiceClient } from '@/lib/supabase/server-actions';
import {
  getSessionDependencies,
  getSessionInfo,
  getSessionScores,
  getSessionUtterances,
  type SessionInfo,
} from '@/lib/supabase/session';

// ========================================
// 型定義（Zodを削除してパフォーマンス向上）
// ========================================

type BoothInfo = {
  name: string;
  description?: string;
  experimentParams?: Record<string, unknown>;
  tags?: string[];
};

// ========================================
// Server Actions
// ========================================

/**
 * 新しいセッションを作成
 */
export const createSessionAction = async (boothInfo?: BoothInfo): Promise<string> => {
  try {
    // ユーザー情報を取得（通常クライアント使用）
    const supabase = await createServerActionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const username = user?.email ? user.email.split('@')[0] : null;

    // セッション作成（サービスクライアント使用でRLSバイパス）
    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from('sessions')
      .insert({
        user_id: user?.id || null,
        username: username,
        notes: boothInfo?.name || null,
        tags: boothInfo?.tags || null,
        experiment_params: (boothInfo?.experimentParams as never) || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[createSessionAction] Error:', error);
      throw error;
    }
    return data.id;
  } catch (error) {
    console.error('[createSessionAction] Error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create session');
  }
};

/**
 * 発話を保存（最適化版）
 */
export const saveUtteranceAction = async (
  sessionId: string,
  utterance: Utterance,
  userId?: string | null,
  username?: string | null
): Promise<number> => {
  try {
    // サービスクライアントを使用（RLSバイパス）
    const supabase = createServiceClient();

    // 発話を保存
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

    if (error) {
      console.error('[saveUtteranceAction] Error:', error);
      throw error;
    }
    return data.id;
  } catch (error) {
    console.error('[saveUtteranceAction] Error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to save utterance');
  }
};

/**
 * スコアを保存（最適化版）
 */
export const saveScoreAction = async (
  sessionId: string,
  utteranceId: number,
  score: Score
): Promise<void> => {
  try {
    // サービスクライアントを使用（RLSバイパス）
    const supabase = createServiceClient();

    // 既存のスコアを確認
    const { data: existing, error: selectError } = await supabase
      .from('scores')
      .select('score')
      .eq('session_id', sessionId)
      .eq('utterance_id', utteranceId)
      .maybeSingle();

    if (selectError) {
      throw selectError;
    }

    const existingScore = existing?.score as Score | null;
    const existingIsImportant = existingScore?.isImportant || false;

    const scoreData = {
      ...score,
      // 既存のisImportantがtrueなら保持
      isImportant: existingIsImportant || score.isImportant,
    };

    if (existing) {
      // 更新
      const { error: updateError } = await supabase
        .from('scores')
        .update({ score: scoreData as never })
        .eq('session_id', sessionId)
        .eq('utterance_id', utteranceId);

      if (updateError) {
        throw updateError;
      }
    } else {
      // 挿入
      const { error: insertError } = await supabase.from('scores').insert({
        session_id: sessionId,
        utterance_id: utteranceId,
        score: scoreData as never,
      });

      if (insertError) {
        throw insertError;
      }
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to save score');
  }
};

/**
 * スコアを一括保存（高速版）
 */
export const saveBatchScoresAction = async (
  sessionId: string,
  scores: Array<{ utteranceId: number; score: Score }>
): Promise<void> => {
  try {
    if (scores.length === 0) return;

    const supabase = createServiceClient();

    // 既存スコアを一括取得
    const utteranceIds = scores.map(s => s.utteranceId);
    const { data: existingScores } = await supabase
      .from('scores')
      .select('utterance_id, score')
      .eq('session_id', sessionId)
      .in('utterance_id', utteranceIds);

    const existingMap = new Map(
      (existingScores || []).map(row => [row.utterance_id, row.score as Score])
    );

    // upsert用のデータを準備
    const upsertData = scores.map(({ utteranceId, score }) => {
      const existing = existingMap.get(utteranceId);
      const existingIsImportant = existing?.isImportant || false;

      return {
        session_id: sessionId,
        utterance_id: utteranceId,
        score: {
          ...score,
          isImportant: existingIsImportant || score.isImportant,
        } as never,
      };
    });

    // 一括upsert
    const { error } = await supabase.from('scores').upsert(upsertData, {
      onConflict: 'session_id,utterance_id',
    });

    if (error) throw error;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to save batch scores');
  }
};

/**
 * 依存関係を保存（最適化版）
 */
export const saveDependenciesAction = async (
  sessionId: string,
  dependencies: DependencyEdge[]
): Promise<void> => {
  try {
    if (dependencies.length === 0) return;

    // サービスクライアントを使用（RLSバイパス）
    const supabase = createServiceClient();

    const rows = dependencies.map(dep => ({
      session_id: sessionId,
      from_utterance_id: dep.from,
      to_utterance_id: dep.to,
    }));

    const { error } = await supabase.from('dependencies').insert(rows);

    // UNIQUE制約違反（重複）は無視
    if (error && error.code !== '23505') {
      throw error;
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to save dependencies');
  }
};

/**
 * セッション情報を取得（最適化版）
 */
export const getSessionInfoAction = async (sessionId: string): Promise<SessionInfo> => {
  try {
    const info = await getSessionInfo(sessionId);
    return info;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to get session info');
  }
};

/**
 * セッションの発話を取得（最適化版）
 */
export const getSessionUtterancesAction = async (sessionId: string): Promise<Utterance[]> => {
  try {
    const utterances = await getSessionUtterances(sessionId);
    return utterances;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to get session utterances');
  }
};

/**
 * セッションのスコアを取得（最適化版）
 */
export const getSessionScoresAction = async (sessionId: string): Promise<Map<number, Score>> => {
  try {
    const scores = await getSessionScores(sessionId);
    return scores;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to get session scores');
  }
};

/**
 * セッションの依存関係を取得（最適化版）
 */
export const getSessionDependenciesAction = async (
  sessionId: string
): Promise<DependencyEdge[]> => {
  try {
    const dependencies = await getSessionDependencies(sessionId);
    return dependencies;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to get session dependencies');
  }
};

/**
 * セッションデータをクリア（最適化版）
 */
export const clearSessionDataAction = async (sessionId: string): Promise<void> => {
  try {
    const supabase = createServiceClient();

    // 依存関係を削除
    const { error: depsError } = await supabase
      .from('dependencies')
      .delete()
      .eq('session_id', sessionId)
      .select();

    if (depsError) {
      throw depsError;
    }

    // スコアを削除
    const { error: scoresError } = await supabase
      .from('scores')
      .delete()
      .eq('session_id', sessionId)
      .select();

    if (scoresError) {
      throw scoresError;
    }

    // 発話を削除
    const { error: utterancesError } = await supabase
      .from('utterances')
      .delete()
      .eq('session_id', sessionId)
      .select();

    if (utterancesError) {
      throw utterancesError;
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to clear session data');
  }
};

/**
 * セッションを削除（最適化版）
 */
export const deleteSessionAction = async (sessionId: string): Promise<void> => {
  try {
    const supabase = createServiceClient();

    // カスケード削除が有効なので、セッション削除だけでOK
    const { error } = await supabase.from('sessions').delete().eq('id', sessionId).select();

    if (error) {
      throw error;
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to delete session');
  }
};

type SessionWithStats = SessionInfo & {
  utteranceCount: number;
  importantCount: number;
  avgScore: number;
  interactionCount: number;
  filterToggleCount: number;
  summarizeCount: number;
};

/**
 * セッション一覧を取得（統計情報付き）
 */
export const getSessionsAction = async (): Promise<Array<SessionWithStats>> => {
  try {
    const supabase = await createServerActionClient();

    // セッション一覧を取得
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (sessionsError) throw sessionsError;

    // 各セッションの統計を並行取得
    const sessionsWithStats = await Promise.all(
      sessions.map(async session => {
        // 発話数を取得
        const { count: utteranceCount } = await supabase
          .from('utterances')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id);

        // スコア情報を取得
        const { data: scores } = await supabase
          .from('scores')
          .select('score')
          .eq('session_id', session.id);

        // インタラクション情報を取得
        const { data: interactions } = await supabase
          .from('user_interactions')
          .select('event_type')
          .eq('session_id', session.id);

        // 重要発言数と平均スコアを計算
        const importantCount =
          scores?.filter(s => (s.score as { isImportant?: boolean })?.isImportant).length || 0;
        const avgScore =
          scores && scores.length > 0
            ? scores.reduce((sum, s) => sum + ((s.score as { score?: number })?.score || 0), 0) /
              scores.length
            : 0;

        // インタラクション回数を計算
        const filterToggleCount =
          interactions?.filter(i => i.event_type === 'filter_toggle').length || 0;
        const summarizeCount = interactions?.filter(i => i.event_type === 'summarize').length || 0;
        const interactionCount = interactions?.length || 0;

        return {
          id: session.id,
          createdAt: session.created_at || new Date().toISOString(),
          userId: session.user_id,
          username: session.username,
          notes: session.notes || undefined,
          tags: session.tags || undefined,
          experimentParams: (session.experiment_params as Record<string, unknown>) || undefined,
          utteranceCount: utteranceCount || 0,
          importantCount,
          avgScore,
          interactionCount,
          filterToggleCount,
          summarizeCount,
        };
      })
    );

    return sessionsWithStats;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to get sessions');
  }
};

/**
 * ユーザーインタラクションを記録
 */
export const saveUserInteractionAction = async (
  sessionId: string,
  eventType: 'filter_toggle' | 'summarize',
  eventData?: Record<string, unknown>
): Promise<void> => {
  try {
    console.log('[saveUserInteractionAction] Start:', { sessionId, eventType, eventData });

    const supabase = await createServerActionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log('[saveUserInteractionAction] User:', { userId: user?.id, email: user?.email });

    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from('user_interactions')
      .insert({
        session_id: sessionId,
        user_id: user?.id || null,
        event_type: eventType,
        event_data: eventData as never,
      })
      .select();

    if (error) {
      console.error('[saveUserInteractionAction] Supabase Error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      // エラーが発生してもアプリケーションの動作に影響しないように、エラーを投げない
    } else {
      console.log('[saveUserInteractionAction] Success:', data);
    }
  } catch (error) {
    console.error('[saveUserInteractionAction] Caught Error:', error);
    if (error instanceof Error) {
      console.error('[saveUserInteractionAction] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
    // エラーが発生してもアプリケーションの動作に影響しないように、エラーを投げない
  }
};

type UserInteractionStats = {
  userId: string | null;
  username: string | null;
  totalInteractions: number;
  filterToggleCount: number;
  summarizeCount: number;
  sessionCount: number;
};

/**
 * ユーザーごとのインタラクション統計を取得
 */
export const getUserInteractionStatsAction = async (): Promise<UserInteractionStats[]> => {
  try {
    const supabase = await createServerActionClient();

    // 全インタラクションを取得
    const { data: interactions, error: interactionsError } = await supabase
      .from('user_interactions')
      .select('user_id, event_type, session_id');

    if (interactionsError) throw interactionsError;

    // セッション情報を取得（ユーザー名を取得するため）
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, user_id, username');

    if (sessionsError) throw sessionsError;

    // ユーザーIDごとにグループ化
    const userStatsMap = new Map<string, UserInteractionStats>();

    for (const interaction of interactions || []) {
      const userId = interaction.user_id || 'anonymous';

      // セッション情報からユーザー名を取得
      const session = sessions?.find(s => s.id === interaction.session_id);
      const username = session?.username || null;

      if (!userStatsMap.has(userId)) {
        userStatsMap.set(userId, {
          userId: interaction.user_id,
          username,
          totalInteractions: 0,
          filterToggleCount: 0,
          summarizeCount: 0,
          sessionCount: 0,
        });
      }

      const stats = userStatsMap.get(userId);
      if (!stats) continue;

      stats.totalInteractions++;

      if (interaction.event_type === 'filter_toggle') {
        stats.filterToggleCount++;
      } else if (interaction.event_type === 'summarize') {
        stats.summarizeCount++;
      }
    }

    // セッション数をカウント
    const sessionsByUser = new Map<string, Set<string>>();
    for (const interaction of interactions || []) {
      const userId = interaction.user_id || 'anonymous';
      if (!sessionsByUser.has(userId)) {
        sessionsByUser.set(userId, new Set());
      }
      sessionsByUser.get(userId)?.add(interaction.session_id);
    }

    // セッション数を設定
    for (const [userId, sessionIds] of sessionsByUser.entries()) {
      const stats = userStatsMap.get(userId);
      if (stats) {
        stats.sessionCount = sessionIds.size;
      }
    }

    // 配列に変換してインタラクション数でソート
    return Array.from(userStatsMap.values()).sort(
      (a, b) => b.totalInteractions - a.totalInteractions
    );
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get user interaction stats'
    );
  }
};

type SessionInteraction = {
  id: number;
  userId: string | null;
  username: string | null;
  eventType: 'filter_toggle' | 'summarize';
  eventData: Record<string, unknown> | null;
  createdAt: string;
};

/**
 * セッションのインタラクション履歴を取得
 */
export const getSessionInteractionsAction = async (
  sessionId: string
): Promise<SessionInteraction[]> => {
  try {
    const supabase = await createServerActionClient();

    // インタラクション履歴を取得
    const { data: interactions, error } = await supabase
      .from('user_interactions')
      .select('id, user_id, event_type, event_data, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // セッション情報を取得してユーザー名を取得
    const { data: session } = await supabase
      .from('sessions')
      .select('username')
      .eq('id', sessionId)
      .single();

    return (interactions || []).map(interaction => ({
      id: interaction.id,
      userId: interaction.user_id,
      username: session?.username || null,
      eventType: interaction.event_type as 'filter_toggle' | 'summarize',
      eventData: interaction.event_data as Record<string, unknown> | null,
      createdAt: interaction.created_at || new Date().toISOString(),
    }));
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to get session interactions');
  }
};

/**
 * セッションをエクスポート（最適化版）
 */
export const exportSessionsAction = async (
  format: 'json' | 'csv',
  sessionId?: string
): Promise<string> => {
  try {
    const supabase = await createServerActionClient();

    let query = supabase.from('sessions').select(`
      id,
      created_at,
      username,
      tags,
      notes,
      experiment_params
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
          .from('scores')
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
      return generateCSV(detailedSessions);
    }

    // JSON形式でエクスポート
    return JSON.stringify(detailedSessions, null, 2);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to export sessions');
  }
};

// ========================================
// Helper Functions
// ========================================

const generateCSV = (sessions: unknown[]): string => {
  const rows: string[] = [];

  // ヘッダー行
  rows.push(
    ['session_id', 'created_at', 'username', 'tags', 'notes', 'experiment_params'].join(',')
  );

  // データ行
  for (const session of sessions as Array<{
    id: string;
    created_at: string;
    username: string | null;
    tags: string[] | null;
    notes: string | null;
    experiment_params: unknown;
  }>) {
    rows.push(
      [
        session.id,
        session.created_at,
        session.username || '',
        session.tags?.join(';') || '',
        (session.notes || '').replace(/"/g, '""'),
        JSON.stringify(session.experiment_params || {}),
      ]
        .map(field => `"${field}"`)
        .join(',')
    );
  }

  return rows.join('\n');
};
