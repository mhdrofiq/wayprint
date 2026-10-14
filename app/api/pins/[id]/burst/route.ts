import { supabase } from '@/lib/supabase';
import { validateId } from '@/lib/supabase-admin';
import { jsonError, PUBLIC_CACHE_HEADERS } from '@/lib/api';
import type { NextRequest } from 'next/server';

// GET /api/pins/:id/burst — images (with reactions) and collections for a pin
export async function GET(_req: NextRequest, ctx: RouteContext<'/api/pins/[id]/burst'>) {
  const { id } = await ctx.params;
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

  if (imagesRes.error) return jsonError(imagesRes.error.message, 500);
  if (collectionsRes.error) return jsonError(collectionsRes.error.message, 500);

  return Response.json(
    { images: imagesRes.data, collections: collectionsRes.data },
    { headers: PUBLIC_CACHE_HEADERS },
  );
}
