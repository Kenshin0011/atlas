/**
 * Supabase Server Client
 * Server-side Supabase client for API routes
 */

import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import type { Database } from './types';

/**
 * Create Supabase client for Edge runtime API routes
 */
export const createClient = (request: NextRequest) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(_cookiesToSet) {
        // In Edge runtime, we can't set cookies from the request
        // Cookies will be set in the response
      },
    },
  });
};
