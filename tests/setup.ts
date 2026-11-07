import { afterEach, beforeEach, vi } from 'vitest';
import { db, r2Pages, r2Sent } from './fakes';

vi.mock('@supabase/supabase-js', async () => {
  const { fakeClient } = await import('./fakes');
  return { createClient: () => fakeClient };
});
vi.mock('@aws-sdk/client-s3', () => import('./fakes'));

beforeEach(() => {
  db.reset();
  r2Sent.length = 0;
  r2Pages.length = 0;
  for (const level of ['log', 'warn', 'error'] as const) vi.spyOn(console, level).mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
