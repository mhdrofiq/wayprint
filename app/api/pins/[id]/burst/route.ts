import { supabase } from '@/lib/supabase';
import { validateId } from '@/lib/supabase-admin';
import type { NextRequest } from 'next/server';

// GET /api/pins/:id/burst — images (with reactions) and collections for a pin
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idError = validateId(id);
  if (idError) return idError;

  const [imagesRes, collectionsRes] = await Promise.all([
    supabase
      .from('images')
      .select('*, reactions(*)')
      .eq('pin_id', id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('collections')
      .select('*')
      .eq('pin_id', id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  if (imagesRes.error) {
    return Response.json({ error: imagesRes.error.message }, { status: 500 });
  }
  if (collectionsRes.error) {
    return Response.json({ error: collectionsRes.error.message }, { status: 500 });
  }

  return Response.json(
    { images: imagesRes.data, collections: collectionsRes.data },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  );
}