import { supabaseAdmin } from '@/lib/supabase';
import type { NextRequest } from 'next/server';

// GET /api/pins/:id — single pin
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('pins')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return Response.json({ error: error.message }, { status });
  }

  return Response.json(data);
}

// PATCH /api/pins/:id — update label (admin only — Phase 5 adds JWT check)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { label } = body;

  if (!label) {
    return Response.json({ error: 'label is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('pins')
    .update({ label, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return Response.json({ error: error.message }, { status });
  }

  return Response.json(data);
}

// DELETE /api/pins/:id — delete pin and cascade images (admin only — Phase 5 adds JWT check)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('pins')
    .delete()
    .eq('id', id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
