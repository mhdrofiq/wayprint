import { supabaseAdmin, validateId } from '@/lib/supabase-admin';
import { computeReactionPosition } from '@/lib/reaction-placement';
import { REACTION_CAP } from '@/lib/reactions';
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
  const emoji = typeof body?.emoji === 'string' ? body.emoji.trim() : null;
  const reactorName =
    typeof body?.reactor_name === 'string' && body.reactor_name.trim()
      ? body.reactor_name.trim().slice(0, 20)
      : 'anon';
  // Without a key the reaction is still added, but only the admin can remove it.
  const reactorKey = parseReactorKey(body?.reactor_key);

  if (!emoji) {
    return jsonError('emoji is required', 400);
  }

  // Must be a single emoji grapheme cluster, max 16 bytes (covers multi-codepoint emoji like flags/ZWJ sequences)
  const graphemes = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(emoji)];
  const isEmoji = /^\p{Emoji}/u.test(emoji);
  if (graphemes.length !== 1 || !isEmoji || Buffer.byteLength(emoji, 'utf8') > 16) {
    return jsonError('emoji must be a single emoji character', 400);
  }

  // Rate limit by IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  // Existing stickers, only to place the new one clear of them. The cap is
  // enforced by add_reaction, not here.
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('reactions')
    .select('pos_x, pos_y')
    .eq('image_id', id);

  if (fetchError) return serverError('db.error', fetchError);

  const position = computeReactionPosition(existing);

  // Rate limit, cap check and insert in one transaction (see
  // supabase/migrations/20261107_add_reaction_atomic.sql), so simultaneous
  // requests can't all pass the counts.
  const { data: result, error } = await supabaseAdmin.rpc('add_reaction', {
    p_image_id: id,
    p_ip: ip,
    p_emoji: emoji,
    p_reactor_name: reactorName,
    p_pos_x: position.pos_x,
    p_pos_y: position.pos_y,
    p_rotation: position.rotation,
    p_owner_key_hash: reactorKey ? hashReactorKey(reactorKey) : null,
    p_cap: REACTION_CAP,
    p_rate_max: RATE_LIMIT_MAX,
    p_rate_window_s: RATE_LIMIT_WINDOW_SECONDS,
  });

  if (error) return serverError('db.error', error);

  // Fire-and-forget purge of old rate-limit rows
  supabaseAdmin.rpc('purge_old_rate_limits').then(() => {});

  const { status, reaction } = result as { status: string; reaction?: unknown };
  switch (status) {
    case 'ok':
      return Response.json(reaction, { status: 201 });
    case 'rate_limited':
      return jsonError('Too many reactions. Please wait a moment.', 429);
    case 'not_found':
      return jsonError('Image not found', 404);
    case 'cap_reached':
      return jsonError('Reaction cap reached', 409);
    default:
      log.error('db.error', { step: 'add_reaction', status });
      return jsonError('Could not add reaction', 500);
  }
});
