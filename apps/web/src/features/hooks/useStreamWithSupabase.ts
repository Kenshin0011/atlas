/**
 * useStreamWithSupabase Hook
 * Supabaseと連携したストリーム管理
 * 会話 → /debug?session=xxx でリアルタイムデバッグ
 */

'use client';

import { defaultOptions, type Utterance } from '@atlas/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createSession,
  getSessionInfo,
  getSessionScores,
  getSessionUtterances,
  type SessionInfo,
  saveScore,
  saveUtterance,
  subscribeToScores,
  subscribeToUtterances,
} from '@/lib/supabase/session';
import type { ImportantUtterance, Score } from './useStream';

export type UseStreamWithSupabaseReturn = {
  // セッションID
  sessionId: string | null;
  // セッション情報
  sessionInfo: SessionInfo | null;
  // 会話履歴
  dialogue: Utterance[];
  // スコアマップ
  scores: Map<number, Score>;
  // 重要発言リスト（時系列順）
  importantList: ImportantUtterance[];
  // 発話を追加
  addUtterance: (utterance: Utterance) => Promise<void>;
  // クリア
  clear: () => void;
  // 分析中フラグ
  isAnalyzing: boolean;
  // エラー
  error: string | null;
  // アンカー数
  anchorCount: number;
};

type UseStreamWithSupabaseOptions = {
  // セッションID（指定すると既存セッションを読み込む）
  sessionId?: string;
  // 重要発言検出時のコールバック
  onImportantDetected?: (important: ImportantUtterance) => void;
  // 分析オプション
  analysisOptions?: {
    k?: number;
    alphaMix?: number;
    halfLifeTurns?: number;
    nullSamples?: number;
    fdrAlpha?: number;
    mmrLambda?: number;
  };
};

export const useStreamWithSupabase = (
  options: UseStreamWithSupabaseOptions = {}
): UseStreamWithSupabaseReturn => {
  const { sessionId: providedSessionId, onImportantDetected, analysisOptions = {} } = options;

  const [sessionId, setSessionId] = useState<string | null>(providedSessionId || null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [dialogue, setDialogue] = useState<Utterance[]>([]);
  const [scores, setScores] = useState<Map<number, Score>>(new Map());
  const [importantList, setImportantList] = useState<ImportantUtterance[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anchorCount, setAnchorCount] = useState(0);

  const onImportantDetectedRef = useRef(onImportantDetected);
  onImportantDetectedRef.current = onImportantDetected;

  // セッション初期化
  useEffect(() => {
    const initSession = async () => {
      try {
        if (providedSessionId) {
          // 既存セッションを読み込む
          const [info, utterances, scoreMap] = await Promise.all([
            getSessionInfo(providedSessionId),
            getSessionUtterances(providedSessionId),
            getSessionScores(providedSessionId),
          ]);
          setSessionInfo(info);
          setDialogue(utterances);
          setScores(scoreMap);

          // 重要発言リストを構築
          const important: ImportantUtterance[] = [];
          for (const utt of utterances) {
            const score = scoreMap.get(utt.id);
            if (score?.isImportant) {
              important.push({
                utterance: utt,
                score,
                timestamp: utt.timestamp,
              });
            }
          }
          setImportantList(important);

          setSessionId(providedSessionId);
        } else {
          // 新規セッションを作成
          const newSessionId = await createSession();
          setSessionId(newSessionId);
          // セッション情報を取得
          const info = await getSessionInfo(newSessionId);
          setSessionInfo(info);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Session initialization error';
        setError(message);
        console.error('セッション初期化エラー:', err);
      }
    };

    initSession();
  }, [providedSessionId]);

  // リアルタイム購読（デバッグモード用）
  useEffect(() => {
    if (!sessionId || providedSessionId === sessionId) return; // 自分のセッションは購読しない

    const utteranceChannel = subscribeToUtterances(sessionId, utterance => {
      setDialogue(prev => [...prev, utterance]);
    });

    const scoreChannel = subscribeToScores(sessionId, (utteranceId, score) => {
      setScores(prev => new Map(prev).set(utteranceId, score));

      if (score.isImportant) {
        setDialogue(currentDialogue => {
          const utt = currentDialogue.find(u => u.id === utteranceId);
          if (utt) {
            setImportantList(prev => [
              ...prev,
              {
                utterance: utt,
                score,
                timestamp: Date.now(),
              },
            ]);
          }
          return currentDialogue;
        });
      }
    });

    return () => {
      utteranceChannel.unsubscribe();
      scoreChannel.unsubscribe();
    };
  }, [sessionId, providedSessionId]);

  const addUtterance = useCallback(
    async (utterance: Utterance) => {
      if (!sessionId) {
        setError('Session not initialized');
        return;
      }

      setIsAnalyzing(true);
      setError(null);

      try {
        // Supabaseに発話を保存
        const dbUtteranceId = await saveUtterance(sessionId, utterance);

        // ローカル状態を更新（IDをDB側のものに同期）
        const savedUtterance: Utterance = {
          ...utterance,
          id: dbUtteranceId,
        };
        const updatedDialogue = [...dialogue, savedUtterance];
        setDialogue(updatedDialogue);

        // 最低2発言以上ないと分析できない
        if (updatedDialogue.length < 2) {
          setIsAnalyzing(false);
          return;
        }

        // 会話分析
        const history = updatedDialogue.slice(0, -1);
        const current = savedUtterance;

        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            history,
            current,
            options: {
              k: analysisOptions.k ?? defaultOptions.k,
              alphaMix: analysisOptions.alphaMix ?? defaultOptions.alphaMix,
              halfLifeTurns: analysisOptions.halfLifeTurns ?? defaultOptions.halfLifeTurns,
              nullSamples: analysisOptions.nullSamples ?? defaultOptions.nullSamples,
              fdrAlpha: analysisOptions.fdrAlpha ?? defaultOptions.fdrAlpha,
              mmrLambda: analysisOptions.mmrLambda ?? defaultOptions.mmrLambda,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Analysis API error: ${response.statusText}`);
        }

        const data: {
          important: Array<{
            id: number;
            text: string;
            score: number;
            rank: number;
            p?: number;
            detail: Score['detail'];
          }>;
          scored: Array<{
            id: number;
            text: string;
            score: number;
            rank: number;
            p?: number;
            detail: Score['detail'];
          }>;
          anchorCount: number;
        } = await response.json();

        // スコアマップ更新 & Supabaseに保存
        const scorePromises: Promise<void>[] = [];
        setScores(prev => {
          const next = new Map(prev);
          for (const item of data.scored) {
            const id = item.id;
            const score: Score = {
              utteranceId: id,
              score: item.score,
              pValue: item.p,
              rank: item.rank,
              isImportant: false,
              detail: item.detail,
            };
            next.set(id, score);

            // Supabaseに保存
            scorePromises.push(saveScore(sessionId, id, score));
          }
          return next;
        });

        // 重要発言リスト更新
        if (data.important.length > 0) {
          const newImportant: ImportantUtterance[] = data.important.map(item => {
            const id = item.id;
            const utt = updatedDialogue.find(u => u.id === id);
            if (!utt) throw new Error(`Utterance ${id} not found`);

            const score: Score = {
              utteranceId: id,
              score: item.score,
              pValue: item.p,
              rank: item.rank,
              isImportant: true,
              detail: item.detail,
            };

            // 重要発言のスコアもSupabaseに保存（上書き）
            scorePromises.push(saveScore(sessionId, id, score));

            return {
              utterance: utt,
              score,
              timestamp: Date.now(),
            };
          });

          setImportantList(prev => [...prev, ...newImportant]);

          // スコアマップの isImportant フラグも更新
          setScores(prev => {
            const next = new Map(prev);
            for (const imp of newImportant) {
              const existing = next.get(imp.utterance.id);
              if (existing) {
                next.set(imp.utterance.id, { ...existing, isImportant: true });
              }
            }
            return next;
          });

          // コールバック呼び出し（最新の重要発言のみ）
          if (onImportantDetectedRef.current && newImportant.length > 0) {
            onImportantDetectedRef.current(newImportant[0]);
          }
        }

        // 全てのスコア保存を待つ
        await Promise.all(scorePromises);

        setAnchorCount(data.anchorCount);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('分析エラー:', err);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [dialogue, sessionId, analysisOptions]
  );

  const clear = useCallback(() => {
    setDialogue([]);
    setScores(new Map());
    setImportantList([]);
    setError(null);
    setAnchorCount(0);
    // Note: セッションはクリアしない（URLで共有可能にするため）
  }, []);

  return {
    sessionId,
    sessionInfo,
    dialogue,
    scores,
    importantList,
    addUtterance,
    clear,
    isAnalyzing,
    error,
    anchorCount,
  };
};
