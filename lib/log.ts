// Server-side structured logging. Each call writes one JSON line to the
// console, which Vercel captures in the project's Logs tab, so lines can be
// filtered by `level`, `event` or any field.
//
// Never pass secrets here: no passwords, tokens, cookies, reactor keys, IPs or
// file contents. Ids, sizes, statuses and error messages are fine.

import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextRequest } from 'next/server';

type Level = 'info' | 'warn' | 'error';
type Fields = Record<string, unknown>;

// Holds the current API request's id so every line logged while handling it
// can be tied back to the request.
const requestContext = new AsyncLocalStorage<{ requestId: string }>();

/** Turns an Error (or a Supabase error object) into plain loggable fields. */
function serializeError(err: unknown): unknown {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  if (err && typeof err === 'object') {
    const { message, code, details, hint } = err as Record<string, unknown>;
    return { message, code, details, hint };
  }
  return err;
}

function write(level: Level, event: string, fields: Fields = {}) {
  const line: Fields = {
    level,
    event,
    time: new Date().toISOString(),
    requestId: requestContext.getStore()?.requestId,
  };
  for (const [key, value] of Object.entries(fields)) {
    line[key] = key === 'err' ? serializeError(value) : value;
  }
  const text = JSON.stringify(line);
  if (level === 'error') console.error(text);
  else if (level === 'warn') console.warn(text);
  else console.log(text);
}

export const log = {
  info: (event: string, fields?: Fields) => write('info', event, fields),
  warn: (event: string, fields?: Fields) => write('warn', event, fields),
  error: (event: string, fields?: Fields) => write('error', event, fields),
};

/**
 * Wraps an API route handler: logs one `api.request` line per call (method,
 * path, status, duration) and turns an unexpected throw into a logged error
 * plus a clean `{ error }` 500.
 */
export function withLogging<Ctx>(
  handler: (request: NextRequest, ctx: Ctx) => Promise<Response>,
) {
  return (request: NextRequest, ctx: Ctx): Promise<Response> => {
    const requestId = request.headers.get('x-vercel-id') ?? crypto.randomUUID().slice(0, 8);
    return requestContext.run({ requestId }, async () => {
      const start = Date.now();
      const base = { method: request.method, path: request.nextUrl.pathname };
      let response: Response;
      try {
        response = await handler(request, ctx);
      } catch (err) {
        log.error('api.unhandled_error', { ...base, err });
        response = Response.json({ error: 'Internal server error' }, { status: 500 });
      }
      const fields = { ...base, status: response.status, ms: Date.now() - start };
      if (response.status >= 500) log.error('api.request', fields);
      else log.info('api.request', fields);
      return response;
    });
  };
}
