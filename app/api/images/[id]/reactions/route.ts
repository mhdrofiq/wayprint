import { supabaseAdmin, DB_NOT_FOUND } from '@/lib/supabase-admin';
import { computeReactionPosition } from '@/lib/reaction-placement';
import type { NextRequest } from 'next/server';

const REACTION_CAP = 15;

// GET /api/images/:id/reactions — public, returns all reactions for an image
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('reactions')
    .select('*')
    .eq('image_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

// POST /api/images/:id/reactions — public, add a reaction (capped at 15 per image)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const emoji = typeof body?.emoji === 'string' ? body.emoji.trim() : null;
  const reactorName =
    typeof body?.reactor_name === 'string' && body.reactor_name.trim()
      ? body.reactor_name.trim().slice(0, 20)
      : 'anon';

  if (!emoji) {
    return Response.json({ error: 'emoji is required' }, { status: 400 });
  }

  // Verify image exists
  const { error: imgError } = await supabaseAdmin
    .from('images')
    .select('id')
    .eq('id', id)
    .single();

  if (imgError) {
    const status = imgError.code === DB_NOT_FOUND ? 404 : 500;
    return Response.json({ error: 'Image not found' }, { status });
  }

  // Fetch existing reactions to enforce cap and compute placement
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('reactions')
    .select('id, pos_x, pos_y')
    .eq('image_id', id);

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 });
  }

  if (existing.length >= REACTION_CAP) {
    return Response.json({ error: 'Reaction cap reached' }, { status: 409 });
  }

  const position = computeReactionPosition(existing);

  const { data, error } = await supabaseAdmin
    .from('reactions')
    .insert({
      image_id: id,
      emoji,
      reactor_name: reactorName,
      pos_x: position.pos_x,
      pos_y: position.pos_y,
      rotation: position.rotation,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
