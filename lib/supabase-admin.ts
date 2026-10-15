import { createClient } from '@supabase/supabase-js';
import { jsonError } from './api';
import { isUuid } from './ids';
import { log } from './log';

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

/** Returns a 404 Response if id is not a valid UUID, otherwise null. */
export function validateId(id: string): Response | null {
  return isUuid(id) ? null : jsonError('Not found', 404);
}

// Maps a Supabase/PostgREST error to the appropriate HTTP error response.
// Anything other than "not found" is logged as a database failure.
export function dbError(error: { code: string; message: string }): Response {
  if (error.code === DB_NOT_FOUND) return jsonError(error.message, 404);
  log.error('db.error', { err: error });
  return jsonError(error.message, 500);
}
