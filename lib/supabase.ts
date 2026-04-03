import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Browser-safe client — uses anon key, respects RLS. Use in React components. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Server-only client — uses service role key, bypasses RLS.
 * Only import this in API routes (never in 'use client' files).
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
