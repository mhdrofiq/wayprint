import { supabaseAdmin, nextSortOrder } from '@/lib/supabase-admin';
import { isUuid } from '@/lib/ids';
import { requireAdmin } from '@/lib/auth';
import { processImage } from '@/lib/image-processing';
import { uploadToR2, deleteFromR2, r2Keys } from '@/lib/r2';
import { jsonError, normalizeCaption, serverError } from '@/lib/api';
import { randomUUID } from 'crypto';
import { log, withLogging } from '@/lib/log';
import type { NextRequest } from 'next/server';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
// Most photos one bulk request may touch.
const MAX_BULK = 500;

/** Reads a non-empty, bounded array of UUIDs, or null if `value` isn't one. */
function parseIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_BULK) return null;
  return value.every((id) => typeof id === 'string' && isUuid(id)) ? value : null;
}

// POST /api/images — upload an image to a pin (admin only)
export const POST = withLogging(async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const formData = await request.formData();
  const file = formData.get('file');
  const pinId = formData.get('pin_id');
  const collectionIdRaw = formData.get('collection_id');
  const collectionId = typeof collectionIdRaw === 'string' && collectionIdRaw ? collectionIdRaw : null;

  // Validate inputs
  if (!pinId || typeof pinId !== 'string') {
    return jsonError('pin_id is required', 400);
  }
  if (collectionId !== null && !isUuid(collectionId)) {
    return jsonError('collection_id must be a UUID', 400);
  }
  if (!file || !(file instanceof File)) {
    return jsonError('file is required', 400);
  }
  if (!file.type.startsWith('image/')) {
    return jsonError('file must be an image', 400);
  }
  if (file.size > MAX_FILE_SIZE) {
    return jsonError('file must be under 20MB', 400);
  }

  // Check pin exists
  const { error: pinError } = await supabaseAdmin
    .from('pins')
    .select('id')
    .eq('id', pinId)
    .single();
  if (pinError) {
    return jsonError('pin not found', 404);
  }

  // Check collection exists and belongs to this pin
  if (collectionId) {
    const { error: collectionError } = await supabaseAdmin
      .from('collections')
      .select('id')
      .eq('id', collectionId)
      .eq('pin_id', pinId)
      .single();
    if (collectionError) {
      return jsonError('collection not found', 404);
    }
  }

  // Process image
  const buffer = Buffer.from(await file.arrayBuffer());
  let processed;
  try {
    processed = await processImage(buffer);
  } catch (err) {
    log.error('image.process_failed', { pinId, type: file.type, bytes: file.size, err });
    return jsonError('could not process image', 500);
  }

  // Upload both variants to R2
  const imageId = randomUUID();
  const keys = r2Keys(pinId, imageId);

  let url, thumb_url;
  try {
    [url, thumb_url] = await Promise.all([
      uploadToR2(keys.full, processed.full, 'image/webp'),
      uploadToR2(keys.thumb, processed.thumb, 'image/webp'),
    ]);
  } catch (err) {
    log.error('r2.upload_failed', { pinId, imageId, err });
    return jsonError('could not store image', 500);
  }

  // Append after existing images
  const sortOrder = await nextSortOrder('images', pinId);

  // Store record in Supabase
  const { data, error } = await supabaseAdmin
    .from('images')
    .insert({
      id: imageId,
      pin_id: pinId,
      url,
      thumb_url,
      sort_order: sortOrder,
      collection_id: collectionId,
    })
    .select()
    .single();

  if (error) return serverError('db.error', error, { pinId, imageId });

  return Response.json(data, { status: 201 });
});

// PATCH /api/images — set several captions at once (admin only).
// Body: { captions: [{ id, caption }] }. Returns { images, failed } so the
// client keeps every caption that saved and reports the rest.
export const PATCH = withLogging(async function PATCH(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { captions } = await request.json();
  const ids = parseIds(Array.isArray(captions) ? captions.map((c) => c?.id) : null);
  if (!ids) return jsonError(`captions must be 1-${MAX_BULK} { id, caption } items`, 400);

  const results = await Promise.all(
    (captions as { id: string; caption: unknown }[]).map(({ id, caption }) =>
      supabaseAdmin.from('images').update({ caption: normalizeCaption(caption) }).eq('id', id).select().single()
    )
  );

  const images = results.flatMap((r) => (r.data ? [r.data] : []));
  const failed = ids.filter((_, i) => results[i].error);
  if (failed.length > 0) log.error('images.caption_update_failed', { failed, err: results.find((r) => r.error)?.error });

  return Response.json({ images, failed });
});

// DELETE /api/images — delete several photos and their R2 files (admin only).
// Body: { ids }. Ids that don't exist are skipped. Returns { deleted }.
export const DELETE = withLogging(async function DELETE(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const ids = parseIds((await request.json()).ids);
  if (!ids) return jsonError(`ids must be 1-${MAX_BULK} UUIDs`, 400);

  const { data: rows, error } = await supabaseAdmin.from('images').delete().in('id', ids).select('id, pin_id');
  if (error) return serverError('db.error', error, { ids });

  // The photos are gone either way; a failure here only leaves unreachable files behind.
  const keys = rows.flatMap((r) => Object.values(r2Keys(r.pin_id, r.id)));
  try {
    for (let i = 0; i < keys.length; i += 20) {
      await Promise.all(keys.slice(i, i + 20).map(deleteFromR2));
    }
  } catch (err) {
    log.warn('r2.cleanup_failed', { ids, err });
  }

  return Response.json({ deleted: rows.map((r) => r.id) });
});
