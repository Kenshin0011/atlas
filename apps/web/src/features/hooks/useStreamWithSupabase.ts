/**
 * useStreamWithSupabase Hook
 * Supabaseと連携したストリーム管理
 * 会話 → /debug?session=xxx でリアルタイムデバッグ
 */

'use client';

import { defaultOptions, type Utterance } from '@atlas/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeConversationAction } from '@/app/actions/analysis';
import {
  createSessionAction,
  saveBatchScoresAction,
  saveDependenciesAction,
  saveUtteranceAction,
} from '@/app/actions/session';
import { supabase } from '@/lib/supabase/client';
import {
  getSessionDependencies,
  getSessionInfo,
  getSessionScores,
  getSessionUtterances,
  type SessionInfo,
  subscribeToDependencies,
  subscribeToScores,
  subscribeToUtterances,
} from '@/lib/supabase/session';
import type { DependencyEdge, ImportantUtterance, Score } from './useStream';

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
  // 依存関係エッジ
  dependencies: DependencyEdge[];
  // 発話を追加
  addUtterance: (utterance: Utterance) => Promise<void>;
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
    halfLifeTurns?: number;
    nullSamples?: number;
    fdrAlpha?: number;
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
  const [dependencies, setDependencies] = useState<DependencyEdge[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anchorCount, setAnchorCount] = useState(0);

  const onImportantDetectedRef = useRef(onImportantDetected);
  onImportantDetectedRef.current = onImportantDetected;

  // 発話処理中フラグ（並列実行を防ぐ）
  const isProcessingRef = useRef(false);

  // ユーザー情報のキャッシュ（毎回取得しないように最適化）
  const userInfoRef = useRef<{ userId: string | null; username: string | null } | null>(null);

  // セッション初期化
  useEffect(() => {
    const initSession = async () => {
      try {
        // ユーザー情報を1回だけ取得してキャッシュ
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const username = user?.email ? user.email.split('@')[0] : null;
        userInfoRef.current = { userId: user?.id || null, username };

        if (providedSessionId) {
          // 既存セッションを読み込む
          const [info, utterances, scoreMap, deps] = await Promise.all([
            getSessionInfo(providedSessionId),
            getSessionUtterances(providedSessionId),
            getSessionScores(providedSessionId),
            getSessionDependencies(providedSessionId),
          ]);
          setSessionInfo(info);
          setDialogue(utterances);
          setScores(scoreMap);
          setDependencies(deps);

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
          const newSessionId = await createSessionAction();
          setSessionId(newSessionId);
          // セッション情報を取得
          const info = await getSessionInfo(newSessionId);
          setSessionInfo(info);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Session initialization error';
        setError(message);
      }
    };

    initSession();
  }, [providedSessionId]);

  // リアルタイム購読
  useEffect(() => {
    if (!sessionId) return;

    // DELETEイベントのハンドラ（履歴リセット検出）
    const handleDelete = () => {
      setDialogue([]);
      setScores(new Map());
      setImportantList([]);
      setDependencies([]);
      setAnchorCount(0);
    };

    const utteranceChannel = subscribeToUtterances(
      sessionId,
      utterance => {
        // 重複チェック（既に存在するIDまたはテキストは追加しない）
        setDialogue(prev => {
          // IDでの重複チェック
          if (prev.some(u => u.id === utterance.id)) {
            return prev;
          }
          // テキストとタイムスタンプでの重複チェック（一時IDとDB IDの重複を防ぐ）
          if (
            prev.some(
              u => u.text === utterance.text && Math.abs(u.timestamp - utterance.timestamp) < 1000 // 1秒以内
            )
          ) {
            return prev;
          }
          return [...prev, utterance];
        });
      },
      handleDelete
    );

    const scoreChannel = subscribeToScores(sessionId, (utteranceId, score) => {
      setScores(prev => new Map(prev).set(utteranceId, score));

      if (score.isImportant) {
        setDialogue(currentDialogue => {
          const utt = currentDialogue.find(u => u.id === utteranceId);
          if (utt) {
            setImportantList(prev => {
              // 重複チェック
              if (prev.some(item => item.utterance.id === utt.id)) {
                return prev;
              }
              return [
                ...prev,
                {
                  utterance: utt,
                  score,
                  timestamp: Date.now(),
                },
              ];
            });
          }
          return currentDialogue;
        });
      }
    });

    const dependencyChannel = subscribeToDependencies(sessionId, edge => {
      setDependencies(prev => {
        // 重複を避けるため、同じエッジがあれば追加しない
        const existingEdges = new Set(prev.map(e => `${e.from}-${e.to}`));
        if (existingEdges.has(`${edge.from}-${edge.to}`)) {
          return prev;
        }
        return [...prev, edge];
      });
    });

    return () => {
      utteranceChannel.unsubscribe();
      scoreChannel.unsubscribe();
      dependencyChannel.unsubscribe();
    };
  }, [sessionId]);

  const addUtterance = useCallback(
    async (utterance: Utterance) => {
      if (!sessionId) {
        setError('Session not initialized');
        return;
      }

      // 空の発話は無視
      if (!utterance.text || utterance.text.trim() === '') {
        return;
      }

      // 並列実行を防ぐ（前の処理が完了するまで待つ）
      if (isProcessingRef.current) {
        return;
      }

      isProcessingRef.current = true;
      setIsAnalyzing(true);
      setError(null);

      try {
        // 楽観的更新：即座にUIに反映（一時IDで）
        let updatedDialogue: Utterance[] = [];
        setDialogue(prev => {
          updatedDialogue = [...prev, utterance];
          return updatedDialogue;
        });

        // バックグラウンドでSupabaseに発話を保存
        const userInfo = userInfoRef.current || { userId: null, username: null };
        const dbUtteranceId = await saveUtteranceAction(
          sessionId,
          utterance,
          userInfo.userId,
          userInfo.username
        );

        // IDをDB側のものに同期（既存のutteranceを更新）
        const savedUtterance: Utterance = {
          ...utterance,
          id: dbUtteranceId,
        };

        setDialogue(prev => {
          // 一時IDの発話をDB IDに置き換え
          const updated = prev.map(u => (u.id === utterance.id ? savedUtterance : u));
          updatedDialogue = updated;
          return updated;
        });

        // 最低2発言以上ないと分析できない
        if (updatedDialogue.length < 2) {
          setIsAnalyzing(false);
          isProcessingRef.current = false;
          return;
        }

        // 会話分析（Server Action）
        const history = updatedDialogue.slice(0, -1);
        const current = savedUtterance;

        const data = await analyzeConversationAction(history, current, {
          k: analysisOptions.k ?? defaultOptions.k,
          halfLifeTurns: analysisOptions.halfLifeTurns ?? defaultOptions.halfLifeTurns,
          nullSamples: analysisOptions.nullSamples ?? defaultOptions.nullSamples,
          fdrAlpha: analysisOptions.fdrAlpha ?? defaultOptions.fdrAlpha,
        });

        // スコアマップ更新
        const scoresToSave: Array<{ utteranceId: number; score: Score }> = [];

        // 重要発話のIDをSetに入れておく
        const importantIds = new Set(data.important.map(item => item.id));

        setScores(prev => {
          const next = new Map(prev);
          for (const item of data.scored) {
            const id = item.id;
            const prevScore = prev.get(id);
            // 既にisImportantだった場合、または今回importantに含まれている場合はtrue
            const isImportant = (prevScore?.isImportant ?? false) || importantIds.has(id);
            const score: Score = {
              utteranceId: id,
              score: item.score,
              pValue: item.p,
              rank: item.rank,
              isImportant: isImportant,
              detail: item.detail,
            };
            next.set(id, score);

            // 保存用リストに追加
            scoresToSave.push({ utteranceId: id, score });
          }
          return next;
        });

        // スコアを一括保存（高速化）
        const batchScorePromise = saveBatchScoresAction(sessionId, scoresToSave);

        // 依存関係保存のPromiseを準備
        let dependenciesPromise: Promise<void> | null = null;

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

            return {
              utterance: utt,
              score,
              timestamp: Date.now(),
            };
          });

          setImportantList(prev => [...prev, ...newImportant]);

          // 依存関係エッジを追加（現在の発話が重要発話に依存）
          const currentId = current.id;
          const newEdges: DependencyEdge[] = data.important.map(item => ({
            from: item.id,
            to: currentId,
          }));
          setDependencies(prev => [...prev, ...newEdges]);

          // 依存関係をSupabaseに保存（並列実行のために準備）
          dependenciesPromise = saveDependenciesAction(sessionId, newEdges);

          // コールバック呼び出し（最新の重要発言のみ）
          if (onImportantDetectedRef.current && newImportant.length > 0) {
            onImportantDetectedRef.current(newImportant[0]);
          }
        }

        // スコア保存と依存関係保存を並列実行
        const saveOperations: Promise<unknown>[] = [batchScorePromise];
        if (dependenciesPromise) {
          saveOperations.push(dependenciesPromise);
        }

        // 全ての保存操作を並列実行（エラーがあっても継続）
        await Promise.allSettled(saveOperations);

        setAnchorCount(data.anchorCount);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setIsAnalyzing(false);
        isProcessingRef.current = false;
      }
    },
    [sessionId, analysisOptions]
  );

  return {
    sessionId,
    sessionInfo,
    dialogue,
    scores,
    importantList,
    dependencies,
    addUtterance,
    isAnalyzing,
    error,
    anchorCount,
  };
};
