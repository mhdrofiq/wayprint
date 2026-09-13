import { supabaseAdmin, dbError, validateId } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth';
import type { NextRequest } from 'next/server';

// PATCH /api/collections/:id — rename a collection (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const idError = validateId(id);
  if (idError) return idError;

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return Response.json({ error: 'name is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('collections')
    .update({ name: name.trim().slice(0, 100) })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return dbError(error);
  }

  return Response.json(data);
}

// DELETE /api/collections/:id — delete a collection (admin only)
// Images in this collection become uncollected (collection_id set to null via FK ON DELETE SET NULL)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const idError = validateId(id);
  if (idError) return idError;

  const { error } = await supabaseAdmin
    .from('collections')
    .delete()
    .eq('id', id);

  if (error) {
    return dbError(error);
  }

  return new Response(null, { status: 204 });
}
