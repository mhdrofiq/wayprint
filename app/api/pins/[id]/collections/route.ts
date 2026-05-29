import { supabaseAdmin, validateId } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth';
import type { NextRequest } from 'next/server';

// POST /api/pins/:id/collections — create a collection (admin only)
export async function POST(
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

  const trimmedName = name.trim().slice(0, 100);

  // Place new collection after existing ones
  const { count } = await supabaseAdmin
    .from('collections')
    .select('*', { count: 'exact', head: true })
    .eq('pin_id', id);

  const { data, error } = await supabaseAdmin
    .from('collections')
    .insert({ pin_id: id, name: trimmedName, sort_order: count ?? 0 })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
