import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth';
import { deleteFromR2, r2Keys } from '@/lib/r2';
import type { NextRequest } from 'next/server';

const NOT_FOUND = 'PGRST116';

// PATCH /api/images/:id — update caption or sort_order (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();
  const { caption, sort_order } = body;

  if (caption === undefined && sort_order === undefined) {
    return Response.json({ error: 'caption or sort_order is required' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (caption !== undefined) update.caption = caption;
  if (sort_order !== undefined) update.sort_order = sort_order;

  const { data, error } = await supabaseAdmin
    .from('images')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    const status = error.code === NOT_FOUND ? 404 : 500;
    return Response.json({ error: error.message }, { status });
  }

  return Response.json(data);
}

// DELETE /api/images/:id — delete image record and R2 files (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;

  // Fetch record first to get pin_id (needed to derive R2 keys)
  const { data: image, error: fetchError } = await supabaseAdmin
    .from('images')
    .select('id, pin_id')
    .eq('id', id)
    .single();

  if (fetchError) {
    const status = fetchError.code === NOT_FOUND ? 404 : 500;
    return Response.json({ error: fetchError.message }, { status });
  }

  // Delete R2 objects and DB record in parallel
  const keys = r2Keys(image.pin_id, image.id);
  await Promise.all([
    deleteFromR2(keys.full),
    deleteFromR2(keys.thumb),
    supabaseAdmin.from('images').delete().eq('id', id),
  ]);

  return new Response(null, { status: 204 });
}
