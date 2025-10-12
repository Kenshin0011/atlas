/**
 * useAuth Hook
 * 認証状態の管理
 */

'use client';

import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { getCurrentUser, onAuthStateChange, signOut } from '@/lib/supabase/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初回ロード時にユーザー情報を取得
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = onAuthStateChange((_event, session) => {
      setUser((session as { user: User } | null)?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  return {
    user,
    loading,
    signOut: handleSignOut,
    isAuthenticated: !!user,
  };
};
