/**
 * useStream Hook
 * リアルタイム会話ストリーム＋重要発言検出
 */

'use client';

import { defaultOptions, type Utterance } from '@atlas/core';
import { useCallback, useRef, useState } from 'react';

export type Score = {
  utteranceId: number;
  score: number;
  pValue?: number;
  rank: number;
  isImportant: boolean; // FDR制御でp<0.1 かつ高スコア
  detail: {
    baseLoss: number;
    maskedLoss: number;
    deltaLoss: number;
    ageWeight: number;
    rawScore: number;
    finalScore: number;
  };
};

export type ImportantUtterance = {
  utterance: Utterance;
  score: Score;
  timestamp: number;
};

export type UseStreamReturn = {
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

type UseStreamOptions = {
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

export const useStream = (options: UseStreamOptions = {}): UseStreamReturn => {
  const { onImportantDetected, analysisOptions = {} } = options;

  const [dialogue, setDialogue] = useState<Utterance[]>([]);
  const [scores, setScores] = useState<Map<number, Score>>(new Map());
  const [importantList, setImportantList] = useState<ImportantUtterance[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anchorCount, setAnchorCount] = useState(0);

  const onImportantDetectedRef = useRef(onImportantDetected);
  onImportantDetectedRef.current = onImportantDetected;

  const addUtterance = useCallback(
    async (utterance: Utterance) => {
      // 会話履歴に追加
      const updatedDialogue = [...dialogue, utterance];
      setDialogue(updatedDialogue);

      // 最低2発言以上ないと分析できない
      if (updatedDialogue.length < 2) return;

      setIsAnalyzing(true);
      setError(null);

      try {
        // 会話分析
        const history = updatedDialogue.slice(0, -1);
        const current = utterance;

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

        // スコアマップ更新
        setScores(prev => {
          const next = new Map(prev);
          for (const item of data.scored) {
            const id = item.id;
            next.set(id, {
              utteranceId: id,
              score: item.score,
              pValue: item.p,
              rank: item.rank,
              isImportant: false,
              detail: item.detail,
            });
          }
          return next;
        });

        // 重要発言リスト更新
        if (data.important.length > 0) {
          const newImportant: ImportantUtterance[] = data.important.map(item => {
            const id = item.id;
            const utt = updatedDialogue.find(u => u.id === id);
            if (!utt) throw new Error(`Utterance ${id} not found`);

            return {
              utterance: utt,
              score: {
                utteranceId: id,
                score: item.score,
                pValue: item.p,
                rank: item.rank,
                isImportant: true,
                detail: item.detail,
              },
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

        setAnchorCount(data.anchorCount);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('分析エラー:', err);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [dialogue, analysisOptions]
  );

  const clear = useCallback(() => {
    setDialogue([]);
    setScores(new Map());
    setImportantList([]);
    setError(null);
    setAnchorCount(0);
  }, []);

  return {
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
