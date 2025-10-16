/**
 * useKeyboardShortcut Hook
 * キーボードショートカット処理
 */

'use client';

import { useCallback } from 'react';

type KeyboardShortcutOptions = {
  /** Cmd (Mac) / Ctrl (Windows) + Enter で実行するコールバック */
  onSubmit?: () => void;
};

/**
 * キーボードショートカットを処理するフック
 * @param options ショートカット設定
 * @returns onKeyDown ハンドラー
 */
export const useKeyboardShortcut = (options: KeyboardShortcutOptions = {}) => {
  const { onSubmit } = options;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      // Cmd+Enter (Mac) または Ctrl+Enter (Windows) で送信
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onSubmit?.();
      }
    },
    [onSubmit]
  );

  return { handleKeyDown };
};
