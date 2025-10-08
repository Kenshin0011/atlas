'use client';

interface NotificationPanelProps {
  notification: {
    id: number;
    level: 'critical' | 'high' | 'medium';
    message: string;
    utterance?: any;
    result?: any;
  };
  onDismiss: () => void;
}

export function NotificationPanel({ notification, onDismiss }: NotificationPanelProps) {
  const levelStyles = {
    critical: {
      bg: 'bg-red-500',
      border: 'border-red-600',
      text: 'text-white',
      icon: '🚨',
    },
    high: {
      bg: 'bg-orange-500',
      border: 'border-orange-600',
      text: 'text-white',
      icon: '⚠️',
    },
    medium: {
      bg: 'bg-blue-500',
      border: 'border-blue-600',
      text: 'text-white',
      icon: 'ℹ️',
    },
  };

  const style = levelStyles[notification.level];

  return (
    <div
      className={`${style.bg} ${style.text} rounded-lg shadow-lg p-4 min-w-[300px] max-w-[400px] border-l-4 ${style.border} animate-slide-in`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{style.icon}</span>
            <span className="font-bold">{notification.message}</span>
          </div>

          {notification.utterance && (
            <div className="text-sm opacity-90 mt-2 p-2 bg-black/10 rounded">
              <div className="font-semibold mb-1">{notification.utterance.speaker}:</div>
              <div>{notification.utterance.text}</div>
            </div>
          )}
        </div>

        <button
          onClick={onDismiss}
          className="hover:bg-white/20 rounded p-1 transition-colors"
          aria-label="閉じる"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
}
