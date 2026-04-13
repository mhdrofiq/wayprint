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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns a 404 Response if id is not a valid UUID, otherwise null. */
export function validateId(id: string): Response | null {
  if (!UUID_RE.test(id)) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  return null;
}

// Maps a Supabase/PostgREST error to the appropriate HTTP error response.
export function dbError(error: { code: string; message: string }): Response {
  const status = error.code === DB_NOT_FOUND ? 404 : 500;
  return Response.json({ error: error.message }, { status });
}
