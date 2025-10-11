'use client';

import { Button, Modal } from '@atlas/ui';
import { useState } from 'react';

type SpeakerNameModalProps = {
  isOpen: boolean;
  onSubmit: (name: string) => void;
};

export const SpeakerNameModal = ({ isOpen, onSubmit }: SpeakerNameModalProps) => {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      handleSubmit();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // 閉じられないようにする
      title="👤 話者名を入力してください"
      maxWidth="md"
    >
      <div className="space-y-4">
        <p className="text-slate-600 dark:text-slate-400">
          他の参加者があなたの発言を識別できるように、名前を入力してください。
        </p>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="例: 山田太郎"
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        />
        <div className="flex justify-end">
          <Button variant="primary" onClick={handleSubmit} disabled={!name.trim()}>
            保存
          </Button>
        </div>
      </div>
    </Modal>
  );
};
