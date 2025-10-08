'use client';

import type { SCAINResult, Utterance } from '@atlas/core';

export type NotificationLevel = 'critical' | 'high' | 'medium';

export type NotificationReason = {
  type: 'topic_shift' | 'high_dependency' | 'decision' | 'question';
  message: string;
};

export type SmartNotificationData = {
  id: number;
  level: NotificationLevel;
  title: string;
  utterance: Utterance;
  result?: SCAINResult;
  reasons: NotificationReason[];
  timestamp: number;
};

type SmartNotificationProps = {
  notification: SmartNotificationData;
  onDismiss: () => void;
  onShowContext: () => void;
};

export const SmartNotification = ({
  notification,
  onDismiss,
  onShowContext,
}: SmartNotificationProps) => {
  const levelConfig = {
    critical: {
      bg: 'bg-red-500',
      border: 'border-red-600',
      text: 'text-white',
      icon: '🚨',
      label: '緊急',
    },
    high: {
      bg: 'bg-orange-500',
      border: 'border-orange-600',
      text: 'text-white',
      icon: '⚠️',
      label: '重要',
    },
    medium: {
      bg: 'bg-blue-500',
      border: 'border-blue-600',
      text: 'text-white',
      icon: 'ℹ️',
      label: '通知',
    },
  };

  const config = levelConfig[notification.level];

  return (
    <div
      className={`${config.bg} ${config.text} rounded-lg shadow-lg p-4 min-w-[320px] max-w-[420px] border-l-4 ${config.border} animate-slide-in`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {/* ヘッダー */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl" role="img" aria-label={config.label}>
              {config.icon}
            </span>
            <span className="font-bold text-sm uppercase tracking-wide">{config.label}</span>
          </div>

          {/* タイトル */}
          <div className="font-semibold mb-2">{notification.title}</div>

          {/* 理由リスト */}
          {notification.reasons.length > 0 && (
            <div className="text-sm opacity-90 mb-3 space-y-1">
              {notification.reasons.map(reason => (
                <div key={`${reason.type}-${reason.message}`} className="flex items-start gap-1">
                  <span>•</span>
                  <span>{reason.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* 発言内容 */}
          <div className="text-sm opacity-90 p-3 bg-black/10 rounded mb-3">
            <div className="font-semibold mb-1">{notification.utterance.speaker}:</div>
            <div className="line-clamp-3">{notification.utterance.text}</div>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onShowContext}
              className="text-xs px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded transition-colors font-medium"
            >
              文脈を表示
            </button>
          </div>
        </div>

        {/* 閉じるボタン */}
        <button
          type="button"
          onClick={onDismiss}
          className="hover:bg-white/20 rounded p-1 transition-colors flex-shrink-0"
          aria-label="閉じる"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            role="img"
            aria-label="閉じる"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
