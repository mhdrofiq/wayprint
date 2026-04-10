import { supabaseAdmin, DB_NOT_FOUND } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth';
import type { NextRequest } from 'next/server';

// DELETE /api/collections/:id — delete a collection (admin only)
// Images in this collection become uncollected (collection_id set to null via FK ON DELETE SET NULL)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('collections')
    .delete()
    .eq('id', id);

  if (error) {
    const status = error.code === DB_NOT_FOUND ? 404 : 500;
    return Response.json({ error: error.message }, { status });
  }

  return new Response(null, { status: 204 });
}
