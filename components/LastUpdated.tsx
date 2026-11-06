import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase-admin';

/** YYYY-MM-DD, in UTC like the server render. */
function formatTimestamp(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

// Cached for 60s so pin pages (rendered per request) don't wait on two queries.
const getTimestamps = unstable_cache(async () => {
  const [pins, images] = await Promise.all([
    supabaseAdmin.from('pins').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
    supabaseAdmin.from('images').select('created_at').order('created_at', { ascending: false }).limit(1).single(),
  ]);
  return [pins.data?.updated_at, images.data?.created_at].filter(Boolean) as string[];
}, ['last-updated'], { revalidate: 60 });

export default async function LastUpdated() {
  const timestamps = await getTimestamps();
  if (timestamps.length === 0) return null;
  const latest = timestamps.reduce((a, b) => (a > b ? a : b));

  return (
    <div className="flex items-center px-2.5 border-r border-tui-line text-tui-dim">
      <span className="max-sm:hidden">updated&nbsp;</span>
      {formatTimestamp(latest)}
    </div>
  );
}
