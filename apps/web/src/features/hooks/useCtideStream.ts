/**
 * useCtideStream Hook
 * リアルタイム会話ストリーム＋重要発言検出
 */

'use client';

import type { Utterance } from '@atlas/core';
import { toCTIDEUtterance } from '@atlas/core';
import { useCallback, useRef, useState } from 'react';

export type CtideScore = {
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
  score: CtideScore;
  timestamp: number;
};

export type UseCtideStreamReturn = {
  // 会話履歴
  dialogue: Utterance[];
  // CTIDEスコアマップ
  scores: Map<number, CtideScore>;
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

type UseCtideStreamOptions = {
  // 重要発言検出時のコールバック
  onImportantDetected?: (important: ImportantUtterance) => void;
  // CTIDEオプション
  ctideOptions?: {
    k?: number;
    alphaMix?: number;
    halfLifeTurns?: number;
    nullSamples?: number;
    fdrAlpha?: number;
    mmrLambda?: number;
  };
};

export const useCtideStream = (options: UseCtideStreamOptions = {}): UseCtideStreamReturn => {
  const { onImportantDetected, ctideOptions = {} } = options;

  const [dialogue, setDialogue] = useState<Utterance[]>([]);
  const [scores, setScores] = useState<Map<number, CtideScore>>(new Map());
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
        // CTIDE分析
        const history = updatedDialogue.slice(0, -1).map(toCTIDEUtterance);
        const current = toCTIDEUtterance(utterance);

        const response = await fetch('/api/ctide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            history,
            current,
            options: {
              k: ctideOptions.k ?? 6,
              alphaMix: ctideOptions.alphaMix ?? 0.6,
              halfLifeTurns: ctideOptions.halfLifeTurns ?? 20,
              nullSamples: ctideOptions.nullSamples ?? 8,
              fdrAlpha: ctideOptions.fdrAlpha ?? 0.1,
              mmrLambda: ctideOptions.mmrLambda ?? 0.7,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`CTIDE API error: ${response.statusText}`);
        }

        const data: {
          important: Array<{
            id: string;
            text: string;
            score: number;
            rank: number;
            p?: number;
            detail: CtideScore['detail'];
          }>;
          scored: Array<{
            id: string;
            text: string;
            score: number;
            rank: number;
            p?: number;
            detail: CtideScore['detail'];
          }>;
          anchorCount: number;
        } = await response.json();

        // スコアマップ更新
        setScores(prev => {
          const next = new Map(prev);
          for (const item of data.scored) {
            const id = Number.parseInt(item.id, 10);
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
            const id = Number.parseInt(item.id, 10);
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
        console.error('CTIDE分析エラー:', err);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [dialogue, ctideOptions]
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
