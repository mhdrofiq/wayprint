import { supabaseAdmin, validateId } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth';
import { jsonError, trimName } from '@/lib/api';
import type { NextRequest } from 'next/server';

// POST /api/pins/:id/collections — create a collection (admin only)
export async function POST(request: NextRequest, ctx: RouteContext<'/api/pins/[id]/collections'>) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await ctx.params;
  const idError = validateId(id);
  if (idError) return idError;

  const { name } = await request.json();

  if (!name || typeof name !== 'string' || !name.trim()) {
    return jsonError('name is required', 400);
  }

  // Place new collection after existing ones
  const { count } = await supabaseAdmin
    .from('collections')
    .select('*', { count: 'exact', head: true })
    .eq('pin_id', id);

  const { data, error } = await supabaseAdmin
    .from('collections')
    .insert({ pin_id: id, name: trimName(name), sort_order: count ?? 0 })
    .select()
    .single();

  if (error) return jsonError(error.message, 500);

  return Response.json(data, { status: 201 });
}
