import { supabaseAdmin, dbError, validateId } from '@/lib/supabase-admin';
import type { NextRequest } from 'next/server';

// DELETE /api/reactions/:id — public (viewers can remove their own reactions)
export async function DELETE(_request: NextRequest, ctx: RouteContext<'/api/reactions/[id]'>) {
  const { id } = await ctx.params;
  const idError = validateId(id);
  if (idError) return idError;

  const { error } = await supabaseAdmin
    .from('reactions')
    .delete()
    .eq('id', id);

  if (error) return dbError(error);

  return new Response(null, { status: 204 });
}
