/**
 * Login Page
 * ユーザー認証ページ
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useId, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { signIn, signUp } from '@/lib/supabase/auth';
import { usernameToEmail } from '@/lib/supabase/username';

const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const usernameId = useId();
  const passwordId = useId();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = searchParams.get('redirect') || '/';

  // すでにログイン済みの場合はリダイレクト
  useEffect(() => {
    if (!loading && user) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // ユーザー名のバリデーション
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError('ユーザー名は英数字、アンダースコア、ハイフンのみ使用できます');
      setIsSubmitting(false);
      return;
    }

    if (username.length < 3) {
      setError('ユーザー名は3文字以上である必要があります');
      setIsSubmitting(false);
      return;
    }

    const email = usernameToEmail(username);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }

      // 成功したらリダイレクト（少し待ってから強制リロード）
      // useEffect のリダイレクトロジックに任せる
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.href = redirectTo;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '認証に失敗しました';
      // 既知のエラーメッセージを日本語に変換
      if (errorMessage.includes('Invalid login credentials')) {
        setError('ユーザー名またはパスワードが間違っています');
      } else if (errorMessage.includes('already registered')) {
        setError('このユーザー名は既に使用されています');
      } else {
        setError(errorMessage);
      }
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* ロゴ・タイトル */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">ATLAS</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Attention Temporal Link Analysis System
          </p>
        </div>

        {/* ログインフォーム */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  mode === 'signin'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                ログイン
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  mode === 'signup'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                新規登録
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              {mode === 'signin'
                ? 'ユーザー名とパスワードでログイン'
                : 'ユニークなユーザー名を設定してください'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor={usernameId}
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                ユーザー名
              </label>
              <input
                id={usernameId}
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase())}
                required
                pattern="[a-zA-Z0-9_\-]+"
                minLength={3}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="username"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                英数字、アンダースコア(_)、ハイフン(-)のみ使用可能
              </p>
            </div>

            <div>
              <label
                htmlFor={passwordId}
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                パスワード
              </label>
              <input
                id={passwordId}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? '処理中...' : mode === 'signin' ? 'ログイン' : '新規登録'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
          <div className="text-slate-600 dark:text-slate-400">読み込み中...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
