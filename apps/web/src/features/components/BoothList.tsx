/**
 * BoothList Component
 * 会話ブースの一覧と作成フォーム
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { type BoothInfo, createSession } from '@/lib/supabase/session';
import { emailToUsername } from '@/lib/supabase/username';

type Session = {
  id: string;
  created_at: string;
  username: string | null;
  notes: string | null;
  tags: string[] | null;
};

export const BoothList = () => {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isAdmin: isAdminUser } = useAdmin();
  const boothNameId = useId();
  const [boothName, setBoothName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingBooths, setExistingBooths] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // 既存ブース一覧を取得
  const fetchBooths = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      setExistingBooths(data.sessions || []);
    } catch (err) {
      console.error('Failed to fetch booths:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooths();
  }, [fetchBooths]);

  const handleCreateBooth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsCreating(true);

    try {
      const boothInfo: BoothInfo = {
        name: boothName,
      };

      const sessionId = await createSession(boothInfo);
      // ブースリストを更新してから遷移
      await fetchBooths();
      router.push(`/booth/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ブース作成に失敗しました');
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* ヘッダー */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>🟢</span>
                <span>Atlas</span>
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                会話ブースを選択または作成
              </p>
              {user && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  ユーザー:{' '}
                  <span className="font-semibold">{emailToUsername(user.email || '')}</span>
                </p>
              )}
              {isAdminUser && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                    管理者:
                  </span>
                  <Link
                    href="/sessions"
                    className="text-xs text-orange-600 dark:text-orange-400 underline hover:text-orange-700"
                  >
                    セッション管理
                  </Link>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={signOut}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* 新規ブース作成フォーム */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            新しい会話ブースを作成
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleCreateBooth} className="space-y-4">
            <div>
              <label
                htmlFor={boothNameId}
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                ブース名
              </label>
              <input
                id={boothNameId}
                type="text"
                value={boothName}
                onChange={e => setBoothName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例：実験A - 条件1"
              />
            </div>

            <button
              type="submit"
              disabled={isCreating || !boothName}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {isCreating ? 'ブース作成中...' : 'ブースを作成して会話を開始'}
            </button>
          </form>
        </div>

        {/* 説明テキスト */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
            ℹ️ ブースについて
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            ブースは実験データを整理するための単位です。ブースごとに会話が記録され、後から分析できます。
          </p>
        </div>

        {/* 既存ブース一覧 */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            既存のブース
          </h2>

          {loading ? (
            <div className="text-center py-8 text-slate-600 dark:text-slate-400">読み込み中...</div>
          ) : existingBooths.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              まだブースがありません。新しいブースを作成してください。
            </div>
          ) : (
            <div className="space-y-3">
              {existingBooths.map(booth => (
                <Link
                  key={booth.id}
                  href={`/booth/${booth.id}`}
                  className="block p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
                        {booth.notes || '(未設定)'}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <span>作成者: {booth.username || '匿名'}</span>
                        <span>•</span>
                        <span>{new Date(booth.created_at).toLocaleString('ja-JP')}</span>
                      </div>
                      {booth.tags && booth.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {booth.tags.map(tag => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <svg
                      className="w-5 h-5 text-slate-400 dark:text-slate-500 mt-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <title>開く</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
