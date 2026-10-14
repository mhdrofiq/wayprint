import { createHash } from 'crypto';

/** Server-only: the stored form of a reactor key. */
export function hashReactorKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** A usable reactor key from untrusted input, or null. */
export function parseReactorKey(value: unknown): string | null {
  return typeof value === 'string' && value.length >= 16 && value.length <= 100 ? value : null;
}
