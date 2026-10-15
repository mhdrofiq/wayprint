import { supabase } from './supabase';
import { jsonError } from './api';
import { log } from './log';
import type { NextRequest } from 'next/server';

/**
 * Validates the Supabase JWT from the Authorization header.
 * Returns null if authenticated, or a 401 Response if not.
 *
 * Usage in an API route:
 *   const authError = await requireAdmin(request);
 *   if (authError) return authError;
 */
export async function requireAdmin(request: NextRequest): Promise<Response | null> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    log.warn('auth.rejected', { reason: 'no_token' });
    return jsonError('Unauthorized', 401);
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || data.user.id !== process.env.ADMIN_USER_ID) {
    log.warn('auth.rejected', { reason: error ? 'invalid_token' : 'not_admin' });
    return jsonError('Unauthorized', 401);
  }

  return null;
}
