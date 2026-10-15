import { supabaseAdmin, dbError, validateId } from '@/lib/supabase-admin';
import { computeReactionPosition } from '@/lib/reaction-placement';
import { REACTION_CAP, REACTION_COLUMNS } from '@/lib/reactions';
import { hashReactorKey, parseReactorKey } from '@/lib/reactor-key';
import { jsonError, serverError } from '@/lib/api';
import { log, withLogging } from '@/lib/log';
import type { NextRequest } from 'next/server';

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX = 5; // max reactions per IP per minute

// POST /api/images/:id/reactions — public, add a reaction (capped at REACTION_CAP per image)
export const POST = withLogging(async function POST(request: NextRequest, ctx: RouteContext<'/api/images/[id]/reactions'>) {
  const { id } = await ctx.params;
  const idError = validateId(id);
  if (idError) return idError;

  const body = await request.json().catch(() => null);
  const rawEmoji = typeof body?.emoji === 'string' ? body.emoji.trim() : null;
  const reactorName =
    typeof body?.reactor_name === 'string' && body.reactor_name.trim()
      ? body.reactor_name.trim().slice(0, 20)
      : 'anon';
  // Without a key the reaction is still added, but only the admin can remove it.
  const reactorKey = parseReactorKey(body?.reactor_key);

  if (!rawEmoji) {
    return jsonError('emoji is required', 400);
  }

  // Must be a single emoji grapheme cluster, max 16 bytes (covers multi-codepoint emoji like flags/ZWJ sequences)
  const graphemes = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(rawEmoji)];
  const isEmoji = /^\p{Emoji}/u.test(rawEmoji);
  if (graphemes.length !== 1 || !isEmoji || Buffer.byteLength(rawEmoji, 'utf8') > 16) {
    return jsonError('emoji must be a single emoji character', 400);
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
    log.error('db.error', { step: 'rate_limit_check', err: rlError });
    return jsonError('Rate limit check failed', 500);
  }

  if ((recentCount ?? 0) >= RATE_LIMIT_MAX) {
    return jsonError('Too many reactions. Please wait a moment.', 429);
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

  if (imgError) return dbError(imgError);

  // Fetch existing reactions to enforce cap and compute placement
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('reactions')
    .select('id, pos_x, pos_y')
    .eq('image_id', id);

  if (fetchError) return serverError('db.error', fetchError);

  if (existing.length >= REACTION_CAP) {
    return jsonError('Reaction cap reached', 409);
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
      owner_key_hash: reactorKey ? hashReactorKey(reactorKey) : null,
    })
    .select(REACTION_COLUMNS)
    .single();

  if (error) return serverError('db.error', error);

  return Response.json(data, { status: 201 });
});
