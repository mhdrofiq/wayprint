import { supabaseAdmin, dbError, validateId } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth';
import { jsonError } from '@/lib/api';
import { REACTOR_KEY_HEADER } from '@/lib/reactions';
import { hashReactorKey, parseReactorKey } from '@/lib/reactor-key';
import { withLogging } from '@/lib/log';
import type { NextRequest } from 'next/server';

// DELETE /api/reactions/:id — the admin, or the browser that added the reaction
// (proved by sending its reactor key).
export const DELETE = withLogging(async function DELETE(request: NextRequest, ctx: RouteContext<'/api/reactions/[id]'>) {
  const { id } = await ctx.params;
  const idError = validateId(id);
  if (idError) return idError;

  const isAdmin = request.headers.has('Authorization') && (await requireAdmin(request)) === null;

  if (!isAdmin) {
    const key = parseReactorKey(request.headers.get(REACTOR_KEY_HEADER));
    if (!key) return jsonError('Forbidden', 403);

    const { data: reaction, error: fetchError } = await supabaseAdmin
      .from('reactions')
      .select('owner_key_hash')
      .eq('id', id)
      .single();

    if (fetchError) return dbError(fetchError);
    if (!reaction.owner_key_hash || reaction.owner_key_hash !== hashReactorKey(key)) {
      return jsonError('Forbidden', 403);
    }
  }

  const { error } = await supabaseAdmin
    .from('reactions')
    .delete()
    .eq('id', id);

  if (error) return dbError(error);

  return new Response(null, { status: 204 });
});
