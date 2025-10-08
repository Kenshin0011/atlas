'use client';

interface ControlPanelProps {
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
  utteranceCount: number;
}

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
            <button
              onClick={onStart}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              開始
            </button>
          ) : (
            <button
              onClick={onStop}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            </button>
          )}

          <button
            onClick={onClear}
            disabled={utteranceCount === 0}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            クリア
          </button>
        </div>
      </div>
    </div>
  );
}
