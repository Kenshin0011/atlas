'use client';

type QuickActionButtonsProps = {
  onShowCurrentContext: () => void;
  onShowImportantOnly: () => void;
  onShowTopicHistory: () => void;
  isImportantOnlyMode: boolean;
  disabled?: boolean;
};

export const QuickActionButtons = ({
  onShowCurrentContext,
  onShowImportantOnly,
  onShowTopicHistory,
  isImportantOnlyMode,
  disabled = false,
}: QuickActionButtonsProps) => {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
      {/* 今なんの話? */}
      <button
        type="button"
        onClick={onShowCurrentContext}
        disabled={disabled}
        className="group flex items-center gap-3 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-400 text-white rounded-full shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed"
        title="現在の発言の文脈を表示"
      >
        <span className="text-2xl" role="img" aria-label="考える">
          🤔
        </span>
        <span className="font-medium">今なんの話?</span>
      </button>

      {/* 重要な発言のみ */}
      <button
        type="button"
        onClick={onShowImportantOnly}
        disabled={disabled}
        className={`group flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed ${
          isImportantOnlyMode
            ? 'bg-amber-500 hover:bg-amber-600 text-white'
            : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
        } disabled:bg-slate-400 disabled:text-white`}
        title="重要な発言のみフィルタ"
      >
        <span className="text-2xl" role="img" aria-label="スター">
          ⭐
        </span>
        <span className="font-medium">{isImportantOnlyMode ? '全て表示' : '重要のみ'}</span>
      </button>

      {/* 話題の流れ */}
      <button
        type="button"
        onClick={onShowTopicHistory}
        disabled={disabled}
        className="group flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 disabled:bg-slate-400 text-slate-700 disabled:text-white rounded-full shadow-lg transition-all hover:shadow-xl border border-slate-300 disabled:border-slate-400 disabled:cursor-not-allowed"
        title="話題の推移を表示"
      >
        <span className="text-2xl" role="img" aria-label="チャート">
          📊
        </span>
        <span className="font-medium">話題の流れ</span>
      </button>
    </div>
  );
};
