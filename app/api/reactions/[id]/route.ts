import { supabaseAdmin, DB_NOT_FOUND } from '@/lib/supabase-admin';
import type { NextRequest } from 'next/server';

// DELETE /api/reactions/:id — public (viewers can remove their own reactions)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('reactions')
    .delete()
    .eq('id', id);

  if (error) {
    const status = error.code === DB_NOT_FOUND ? 404 : 500;
    return Response.json({ error: error.message }, { status });
  }

  return new Response(null, { status: 204 });
}
