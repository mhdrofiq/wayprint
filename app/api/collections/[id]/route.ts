import { supabaseAdmin, dbError, validateId } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth';
import { jsonError, trimName } from '@/lib/api';
import type { NextRequest } from 'next/server';

// PATCH /api/collections/:id — rename a collection (admin only)
export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/collections/[id]'>) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await ctx.params;
  const idError = validateId(id);
  if (idError) return idError;

  const { name } = await request.json();

  if (!name || typeof name !== 'string' || !name.trim()) {
    return jsonError('name is required', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('collections')
    .update({ name: trimName(name) })
    .eq('id', id)
    .select()
    .single();

  if (error) return dbError(error);

  return Response.json(data);
}

// DELETE /api/collections/:id — delete a collection (admin only)
// Images in this collection become uncollected (collection_id set to null via FK ON DELETE SET NULL)
export async function DELETE(request: NextRequest, ctx: RouteContext<'/api/collections/[id]'>) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await ctx.params;
  const idError = validateId(id);
  if (idError) return idError;

  const { error } = await supabaseAdmin
    .from('collections')
    .delete()
    .eq('id', id);

  if (error) return dbError(error);

  return new Response(null, { status: 204 });
}
