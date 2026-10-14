import { validateId } from '@/lib/supabase-admin';
import { jsonError, PUBLIC_CACHE_HEADERS } from '@/lib/api';
import { fetchBurst } from '@/lib/queries';
import type { NextRequest } from 'next/server';

// GET /api/pins/:id/burst — images (with reactions) and collections for a pin
export async function GET(_req: NextRequest, ctx: RouteContext<'/api/pins/[id]/burst'>) {
  const { id } = await ctx.params;
  const idError = validateId(id);
  if (idError) return idError;

  try {
    return Response.json(await fetchBurst(id), { headers: PUBLIC_CACHE_HEADERS });
  } catch (error) {
    return jsonError((error as Error).message, 500);
  }
}
