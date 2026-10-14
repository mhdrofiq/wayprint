// Small helpers shared by the API route handlers.

/** The `{ error }` JSON body every API route returns on failure. */
export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
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
