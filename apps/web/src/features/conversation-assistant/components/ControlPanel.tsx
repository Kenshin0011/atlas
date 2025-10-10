'use client';

import { Button } from '@atlas/ui';

type ControlPanelProps = {
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
  utteranceCount: number;
};

export function ControlPanel({
  isListening,
  onStart,
  onStop,
  onClear,
  utteranceCount,
}: ControlPanelProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between">
        {/* ステータス */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {isListening ? '音声認識中' : '待機中'}
            </span>
          </div>

          <div className="text-sm text-slate-500 dark:text-slate-400">発言数: {utteranceCount}</div>
        </div>

        {/* コントロールボタン */}
        <div className="flex gap-3">
          {!isListening ? (
            <Button variant="primary" onClick={onStart} className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="マイク"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              開始
            </Button>
          ) : (
            <Button variant="danger" onClick={onStop} className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="停止"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                />
              </svg>
              停止
            </Button>
          )}

          <Button variant="secondary" onClick={onClear} disabled={utteranceCount === 0}>
            クリア
          </Button>
        </div>
      </div>
    </div>
  );
}
