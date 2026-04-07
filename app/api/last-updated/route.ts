import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/last-updated — returns the most recent edit timestamp across pins and images
export async function GET() {
  const [pins, images] = await Promise.all([
    supabaseAdmin.from('pins').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
    supabaseAdmin.from('images').select('created_at').order('created_at', { ascending: false }).limit(1).single(),
  ]);

  const timestamps = [
    pins.data?.updated_at,
    images.data?.created_at,
  ].filter(Boolean) as string[];

  if (timestamps.length === 0) {
    return Response.json({ timestamp: null });
  }

  const latest = timestamps.reduce((a, b) => (a > b ? a : b));
  return Response.json({ timestamp: latest });
}
