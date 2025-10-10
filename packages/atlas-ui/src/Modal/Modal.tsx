'use client';

import type { ReactNode } from 'react';

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
};

/**
 * Modal dialog component with backdrop and close functionality.
 *
 * @example
 * <Modal isOpen={isOpen} onClose={handleClose} title="Settings">
 *   <p>Modal content</p>
 * </Modal>
 */
export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'lg' }: ModalProps) => {
  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full ${maxWidthStyles[maxWidth]} max-h-[90vh] overflow-hidden flex flex-col`}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg p-2 transition-colors"
              aria-label="閉じる"
            >
              <svg
                className="w-6 h-6 text-slate-600 dark:text-slate-400"
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
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
};
