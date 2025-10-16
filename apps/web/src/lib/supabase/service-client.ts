/**
 * Supabase Service Client
 * Server-side Supabase client with service role key for admin operations
 * Bypasses Row Level Security (RLS) policies
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables for service client');
}

/**
 * Service client with service role permissions
 * WARNING: Only use this for trusted server-side operations that require bypassing RLS
 */
export const supabaseService = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
