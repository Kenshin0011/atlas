'use client';

import { ConversationAssistant } from '@/components/ConversationAssistant';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <ConversationAssistant />
    </div>
  );
}
