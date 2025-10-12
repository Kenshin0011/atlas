/**
 * useAdmin Hook
 * Check if current user has admin privileges
 */

'use client';

import { useMemo } from 'react';
import { isAdmin } from '@/lib/supabase/admin';
import { emailToUsername } from '@/lib/supabase/username';
import { useAuth } from './useAuth';

export const useAdmin = () => {
  const { user, loading } = useAuth();

  const isAdminUser = useMemo(() => {
    if (!user?.email) return false;
    const username = emailToUsername(user.email);
    return isAdmin(username);
  }, [user?.email]);

  return {
    isAdmin: isAdminUser,
    loading,
  };
};
