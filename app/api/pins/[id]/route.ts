import { supabase } from '@/lib/supabase';
import { supabaseAdmin, dbError, validateId } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth';
import type { NextRequest } from 'next/server';

// GET /api/pins/:id — single pin
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idError = validateId(id);
  if (idError) return idError;

  const { data, error } = await supabase
    .from('pins')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return dbError(error);
  }

  return Response.json(data);
}

// PATCH /api/pins/:id — update label (admin only)
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
  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 100) : body.label;

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
    return dbError(error);
  }

  return Response.json(data);
}

// DELETE /api/pins/:id — delete pin and cascade images (admin only)
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
    .from('pins')
    .delete()
    .eq('id', id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
