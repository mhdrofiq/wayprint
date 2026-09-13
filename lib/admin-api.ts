/**
 * Client-side fetch wrapper for admin API routes: attaches the bearer token
 * and JSON-encodes an optional body. Returns the raw Response so callers keep
 * their own ok / error handling.
 */
export function adminFetch(
  path: string,
  token: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
