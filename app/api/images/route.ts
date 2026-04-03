import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth';
import { processImage } from '@/lib/image-processing';
import { uploadToR2, r2Keys } from '@/lib/r2';
import { randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

// POST /api/images — upload an image to a pin (admin only)
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const formData = await request.formData();
  const file = formData.get('file');
  const pinId = formData.get('pin_id');

  // Validate inputs
  if (!pinId || typeof pinId !== 'string') {
    return Response.json({ error: 'pin_id is required' }, { status: 400 });
  }
  if (!file || !(file instanceof File)) {
    return Response.json({ error: 'file is required' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return Response.json({ error: 'file must be an image' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: 'file must be under 20MB' }, { status: 400 });
  }

  // Check pin exists
  const { error: pinError } = await supabaseAdmin
    .from('pins')
    .select('id')
    .eq('id', pinId)
    .single();
  if (pinError) {
    return Response.json({ error: 'pin not found' }, { status: 404 });
  }

  // Process image
  const buffer = Buffer.from(await file.arrayBuffer());
  const { full, thumb } = await processImage(buffer);

  // Upload both variants to R2
  const imageId = randomUUID();
  const keys = r2Keys(pinId, imageId);

  const [url, thumb_url] = await Promise.all([
    uploadToR2(keys.full, full, 'image/webp'),
    uploadToR2(keys.thumb, thumb, 'image/webp'),
  ]);

  // Determine sort_order (append after existing images)
  const { count } = await supabaseAdmin
    .from('images')
    .select('*', { count: 'exact', head: true })
    .eq('pin_id', pinId);

  // Store record in Supabase
  const { data, error } = await supabaseAdmin
    .from('images')
    .insert({
      id: imageId,
      pin_id: pinId,
      url,
      thumb_url,
      sort_order: count ?? 0,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
