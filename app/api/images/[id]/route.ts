import { supabaseAdmin } from '@/lib/supabase';
import type { NextRequest } from 'next/server';

// PATCH /api/images/:id — update caption or sort_order (admin only — Phase 5 adds JWT check)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const status = error.code === 'PGRST116' ? 404 : 500;
    return Response.json({ error: error.message }, { status });
  }

  return Response.json(data);
}

// DELETE /api/images/:id — delete image record (R2 file cleanup added in Phase 4)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('images')
    .delete()
    .eq('id', id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
