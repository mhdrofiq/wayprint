import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Server-only client — uses service role key, bypasses RLS.
 * Only import this in API routes (never in 'use client' files).
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// PostgREST error code for "no rows found" — used by API routes that need to
// return 404 when a record doesn't exist.
export const DB_NOT_FOUND = 'PGRST116';

// Maps a Supabase/PostgREST error to the appropriate HTTP error response.
export function dbError(error: { code: string; message: string }): Response {
  const status = error.code === DB_NOT_FOUND ? 404 : 500;
  return Response.json({ error: error.message }, { status });
}
