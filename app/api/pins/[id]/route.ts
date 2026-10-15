import { supabase } from '@/lib/supabase';
import { supabaseAdmin, dbError, validateId } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth';
import { jsonError, trimName, serverError } from '@/lib/api';
import { deletePrefixFromR2, r2PinPrefix } from '@/lib/r2';
import { log, withLogging } from '@/lib/log';
import type { NextRequest } from 'next/server';

// GET /api/pins/:id — single pin
export const GET = withLogging(async function GET(_req: NextRequest, ctx: RouteContext<'/api/pins/[id]'>) {
  const { id } = await ctx.params;
  const idError = validateId(id);
  if (idError) return idError;

  const { data, error } = await supabase
    .from('pins')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return dbError(error);

  return Response.json(data);
});

// PATCH /api/pins/:id — update label (admin only)
export const PATCH = withLogging(async function PATCH(request: NextRequest, ctx: RouteContext<'/api/pins/[id]'>) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await ctx.params;
  const idError = validateId(id);
  if (idError) return idError;

  const body = await request.json();
  const label = trimName(body.label);

  if (!label) return jsonError('label is required', 400);

  const { data, error } = await supabaseAdmin
    .from('pins')
    .update({ label, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return dbError(error);

  return Response.json(data);
});

// DELETE /api/pins/:id — delete pin, cascade its images, and remove their R2 files (admin only)
export const DELETE = withLogging(async function DELETE(request: NextRequest, ctx: RouteContext<'/api/pins/[id]'>) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await ctx.params;
  const idError = validateId(id);
  if (idError) return idError;

  const { error } = await supabaseAdmin
    .from('pins')
    .delete()
    .eq('id', id);

  if (error) return serverError('db.error', error);

  // The pin is gone either way; a failure here only leaves unreachable files behind.
  try {
    await deletePrefixFromR2(r2PinPrefix(id));
  } catch (err) {
    log.warn('r2.cleanup_failed', { pinId: id, err });
  }

  return new Response(null, { status: 204 });
});
