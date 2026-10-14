import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth';
import { jsonError, PUBLIC_CACHE_HEADERS, trimName } from '@/lib/api';
import { fetchPins } from '@/lib/queries';
import type { NextRequest } from 'next/server';

// GET /api/pins — list all pins with image counts
export async function GET() {
  try {
    return Response.json(await fetchPins(), { headers: PUBLIC_CACHE_HEADERS });
  } catch (error) {
    return jsonError((error as Error).message, 500);
  }
}

// POST /api/pins — create a new pin (admin only)
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  const { lat, lng } = body;
  const label = trimName(body.label);

  if (!label || lat == null || lng == null) {
    return jsonError('label, lat, and lng are required', 400);
  }

  // Japan bounding box
  if (typeof lat !== 'number' || typeof lng !== 'number' ||
      lat < 24 || lat > 46 || lng < 122 || lng > 154) {
    return jsonError('Coordinates must be within Japan', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('pins')
    .insert({ label, lat, lng })
    .select()
    .single();

  if (error) return jsonError(error.message, 500);

  return Response.json(data, { status: 201 });
}
