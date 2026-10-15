// Small helpers shared by the API route handlers.

import { log } from './log';

/** The `{ error }` JSON body every API route returns on failure. */
export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** Logs `err` under `event`, then returns its message as a 500 `{ error }`. */
export function serverError(event: string, err: { message: string }, fields?: Record<string, unknown>): Response {
  log.error(event, { ...fields, err });
  return jsonError(err.message, 500);
}

/** Public reads are cached by Vercel's CDN for 60s, then revalidated in the background. */
export const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
};

/** Longest pin label or collection name the API stores. */
export const MAX_NAME_LENGTH = 100;

/** Trims and caps a string; non-strings pass through untouched so the caller's
 *  validation can reject them. */
export function trimName(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().slice(0, MAX_NAME_LENGTH) : value;
}
