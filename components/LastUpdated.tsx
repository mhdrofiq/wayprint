import { supabaseAdmin } from '@/lib/supabase-admin';

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function LastUpdated() {
  const [pins, images] = await Promise.all([
    supabaseAdmin.from('pins').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
    supabaseAdmin.from('images').select('created_at').order('created_at', { ascending: false }).limit(1).single(),
  ]);

  const timestamps = [pins.data?.updated_at, images.data?.created_at].filter(Boolean) as string[];
  if (timestamps.length === 0) return null;
  const latest = timestamps.reduce((a, b) => (a > b ? a : b));

  return (
    <div className="text-zinc-500 rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap bg-white shadow-md">
      Updated {formatTimestamp(latest)}
    </div>
  );
}
