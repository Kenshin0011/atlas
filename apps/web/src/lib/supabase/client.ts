/**
 * Supabase Client
 * Browser-side Supabase client for CTIDE session management
 * Uses cookie-based storage for SSR compatibility
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
