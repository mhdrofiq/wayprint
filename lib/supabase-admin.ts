import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Server-only client — uses service role key, bypasses RLS.
 * Only import this in API routes (never in 'use client' files).
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
