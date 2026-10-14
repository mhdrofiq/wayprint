import type { Pin } from '@/types';

/** A sorted copy of `pins`, most recently created first. */
export function sortNewestFirst(pins: Pin[]): Pin[] {
  return [...pins].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
