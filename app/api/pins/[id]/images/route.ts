import { supabaseAdmin } from '@/lib/supabase';
import type { NextRequest } from 'next/server';

// GET /api/pins/:id/images — all images for a pin, ordered by sort_order
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('images')
    .select('*')
    .eq('pin_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}
