import { validateId } from '@/lib/supabase-admin';
import { PUBLIC_CACHE_HEADERS, serverError } from '@/lib/api';
import { fetchBurst } from '@/lib/queries';
import { withLogging } from '@/lib/log';
import type { NextRequest } from 'next/server';

// GET /api/pins/:id/burst — images (with reactions) and collections for a pin
export const GET = withLogging(async function GET(_req: NextRequest, ctx: RouteContext<'/api/pins/[id]/burst'>) {
  const { id } = await ctx.params;
  const idError = validateId(id);
  if (idError) return idError;

  try {
    return Response.json(await fetchBurst(id), { headers: PUBLIC_CACHE_HEADERS });
  } catch (error) {
    return serverError('db.error', error as Error);
  }
});
