// Public read queries shared by the API routes and the server-rendered pages.
// Each throws on a database error so callers decide how to surface it.

import { supabase } from '@/lib/supabase';
import { REACTION_COLUMNS } from '@/lib/reactions';
import type { Collection, Image, Pin } from '@/types';

/** All pins, oldest first, each with its image count. */
export async function fetchPins(): Promise<Pin[]> {
  const { data, error } = await supabase
    .from('pins')
    .select('*, images(count)')
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Flatten the count from Supabase's nested aggregate format
  return data.map(({ images, ...pin }) => ({
    ...pin,
    image_count: (images as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

export type BurstData = { images: Image[]; collections: Collection[] };

/** A pin's images (with reactions) and collections, in display order. */
export async function fetchBurst(pinId: string): Promise<BurstData> {
  const [imagesRes, collectionsRes] = await Promise.all([
    supabase
      .from('images')
      .select(`*, reactions(${REACTION_COLUMNS})`)
      .eq('pin_id', pinId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('collections')
      .select('*')
      .eq('pin_id', pinId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  if (imagesRes.error) throw imagesRes.error;
  if (collectionsRes.error) throw collectionsRes.error;
  return { images: imagesRes.data, collections: collectionsRes.data };
}
