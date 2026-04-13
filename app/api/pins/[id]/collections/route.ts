import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth';
import type { NextRequest } from 'next/server';

// GET /api/pins/:id/collections — all collections for a pin, ordered by sort_order
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('pin_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

// POST /api/pins/:id/collections — create a collection (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return Response.json({ error: 'name is required' }, { status: 400 });
  }

  // Place new collection after existing ones
  const { count } = await supabaseAdmin
    .from('collections')
    .select('*', { count: 'exact', head: true })
    .eq('pin_id', id);

  const { data, error } = await supabaseAdmin
    .from('collections')
    .insert({ pin_id: id, name: name.trim(), sort_order: count ?? 0 })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
