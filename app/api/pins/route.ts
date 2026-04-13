import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth';
import type { NextRequest } from 'next/server';

// GET /api/pins — list all pins with image counts
export async function GET() {
  const { data, error } = await supabase
    .from('pins')
    .select('*, images(count)')
    .order('created_at', { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Flatten the count from Supabase's nested aggregate format
  const pins = data.map(({ images, ...pin }) => ({
    ...pin,
    image_count: (images as unknown as { count: number }[])[0]?.count ?? 0,
  }));

  return Response.json(pins);
}

// POST /api/pins — create a new pin (admin only)
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  const { lat, lng } = body;
  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 100) : body.label;

  if (!label || lat == null || lng == null) {
    return Response.json({ error: 'label, lat, and lng are required' }, { status: 400 });
  }

  // Japan bounding box
  if (typeof lat !== 'number' || typeof lng !== 'number' ||
      lat < 24 || lat > 46 || lng < 122 || lng > 154) {
    return Response.json({ error: 'Coordinates must be within Japan' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('pins')
    .insert({ label, lat, lng })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
