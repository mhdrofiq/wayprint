import { supabase } from '@/lib/supabase';
import { supabaseAdmin, dbError, validateId } from '@/lib/supabase-admin';
import { computeReactionPosition } from '@/lib/reaction-placement';
import type { NextRequest } from 'next/server';

const REACTION_CAP = 15;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX = 5; // max reactions per IP per minute

// GET /api/images/:id/reactions — public, returns all reactions for an image
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idError = validateId(id);
  if (idError) return idError;

  const { data, error } = await supabase
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
  const idError = validateId(id);
  if (idError) return idError;

  const body = await request.json().catch(() => null);
  const rawEmoji = typeof body?.emoji === 'string' ? body.emoji.trim() : null;
  const reactorName =
    typeof body?.reactor_name === 'string' && body.reactor_name.trim()
      ? body.reactor_name.trim().slice(0, 20)
      : 'anon';

  if (!rawEmoji) {
    return Response.json({ error: 'emoji is required' }, { status: 400 });
  }

  // Must be a single emoji grapheme cluster, max 16 bytes (covers multi-codepoint emoji like flags/ZWJ sequences)
  const graphemes = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(rawEmoji)];
  const isEmoji = /^\p{Emoji}/u.test(rawEmoji);
  if (graphemes.length !== 1 || !isEmoji || Buffer.byteLength(rawEmoji, 'utf8') > 16) {
    return Response.json({ error: 'emoji must be a single emoji character' }, { status: 400 });
  }
  const emoji = rawEmoji;

  // Rate limit by IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
  const { count: recentCount, error: rlError } = await supabaseAdmin
    .from('reaction_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('created_at', windowStart);

  if (rlError) {
    return Response.json({ error: 'Rate limit check failed' }, { status: 500 });
  }

  if ((recentCount ?? 0) >= RATE_LIMIT_MAX) {
    return Response.json({ error: 'Too many reactions. Please wait a moment.' }, { status: 429 });
  }

  // Log this attempt (fire-and-forget purge of old rows)
  await supabaseAdmin.from('reaction_rate_limits').insert({ ip });
  supabaseAdmin.rpc('purge_old_rate_limits').then(() => {});

  // Verify image exists
  const { error: imgError } = await supabaseAdmin
    .from('images')
    .select('id')
    .eq('id', id)
    .single();

  if (imgError) {
    return dbError(imgError);
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
