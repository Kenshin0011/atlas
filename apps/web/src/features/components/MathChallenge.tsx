/**
 * MathChallenge Component
 * 2桁の掛け算問題を出題し、正解数を記録
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

type MathChallengeProps = {
  onAnswerSubmit?: (isCorrect: boolean) => void;
};

export const MathChallenge = ({ onAnswerSubmit }: MathChallengeProps) => {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [answer, setAnswer] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  // 新しい問題を生成
  const generateProblem = useCallback(() => {
    const n1 = Math.floor(Math.random() * 90) + 10; // 10-99
    const n2 = Math.floor(Math.random() * 90) + 10; // 10-99
    setNum1(n1);
    setNum2(n2);
    setAnswer('');
    setFeedback(null);
  }, []);

  // 初期問題生成
  useEffect(() => {
    generateProblem();
  }, [generateProblem]);

  // 解答送信
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const userAnswer = Number.parseInt(answer, 10);
      const correctAnswer = num1 * num2;
      const isCorrect = userAnswer === correctAnswer;

      setTotalCount(prev => prev + 1);
      if (isCorrect) {
        setCorrectCount(prev => prev + 1);
        setFeedback('correct');
      } else {
        setFeedback('incorrect');
      }

      // コールバック実行
      onAnswerSubmit?.(isCorrect);

      // 1秒後に次の問題へ
      setTimeout(() => {
        generateProblem();
      }, 1000);
    },
    [answer, num1, num2, onAnswerSubmit, generateProblem]
  );

  // Enterキーで送信
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && answer.trim()) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    },
    [answer, handleSubmit]
  );

  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700">
      {/* ヘッダー */}
      <div className="flex-none px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">掛け算</h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 dark:text-slate-400">正解:</span>
            <span className="font-bold text-green-600 dark:text-green-400 text-xl">
              {correctCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600 dark:text-slate-400">全体:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 text-xl">
              {totalCount}
            </span>
          </div>
          {totalCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400">正答率:</span>
              <span
                className={`font-bold text-xl ${
                  accuracy >= 80
                    ? 'text-green-600 dark:text-green-400'
                    : accuracy >= 60
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                }`}
              >
                {accuracy}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 問題エリア */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* 問題表示 */}
          <div className="text-center mb-8">
            <div className="text-6xl font-bold text-slate-800 dark:text-slate-100 mb-4 font-mono">
              {num1} × {num2}
            </div>
            <div className="text-4xl text-slate-400 dark:text-slate-500 mb-6">=</div>

            {/* フィードバック */}
            {feedback === 'correct' && (
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 animate-pulse">
                ✓ 正解！
              </div>
            )}
            {feedback === 'incorrect' && (
              <div className="text-2xl font-bold text-red-600 dark:text-red-400 animate-pulse">
                ✗ 不正解（正解: {num1 * num2}）
              </div>
            )}
          </div>

          {/* 解答フォーム */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="number"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="答えを入力"
              className="w-full px-6 py-4 text-3xl text-center border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              disabled={feedback !== null}
            />
            <button
              type="submit"
              disabled={!answer.trim() || feedback !== null}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-bold text-lg transition-colors"
            >
              解答する
            </button>
          </form>

          {/* ヒント */}
          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Enterキーで送信できます
          </div>
        </div>
      </div>
    </div>
  );
};
