import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import MapView from '@/components/map/MapView';
import AboutPanel from '@/components/AboutPanel';
import LastUpdated from '@/components/LastUpdated';
import { layers } from '@/lib/layers';
import { supabase } from '@/lib/supabase';
import { UNCOLLECTED, type CollectionId } from '@/hooks/useCollectionFilter';

export const revalidate = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PinData = {
  label: string;
  collections: { id: string; name: string }[];
  // Just enough to resolve default + first-image-per-bucket for OG.
  images: { collection_id: string | null; thumb_url: string; sort_order: number; created_at: string }[];
};

// Cached per-request so generateMetadata and the page component share one DB round-trip.
const getPinData = cache(async (id: string): Promise<PinData | null> => {
  if (!UUID_RE.test(id)) return null;

  const [pinRes, colsRes, imgsRes] = await Promise.all([
    supabase.from('pins').select('id, label').eq('id', id).maybeSingle(),
    supabase
      .from('collections')
      .select('id, name')
      .eq('pin_id', id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('images')
      .select('collection_id, thumb_url, sort_order, created_at')
      .eq('pin_id', id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  if (!pinRes.data) return null;
  return {
    label: pinRes.data.label,
    collections: colsRes.data ?? [],
    images: imgsRes.data ?? [],
  };
});

// Mirrors the smart default from useCollectionFilter: uncollected if any exist,
// else the first collection, else uncollected as an empty-state fallback.
function defaultCollectionId(data: PinData): CollectionId {
  const hasUncollected = data.images.some((i) => i.collection_id === null);
  if (hasUncollected) return UNCOLLECTED;
  if (data.collections.length > 0) return data.collections[0].id;
  return UNCOLLECTED;
}

// Resolves the requested ?c= value against what actually exists on the pin.
// Returns the canonical id + metadata for the collection view.
function resolveCollection(
  data: PinData,
  requested: string | undefined,
): { id: CollectionId; name: string; coverUrl: string | null; isCanonical: boolean } {
  const fallback = defaultCollectionId(data);
  let id: CollectionId = fallback;

  if (requested === UNCOLLECTED) {
    if (data.images.some((i) => i.collection_id === null)) id = UNCOLLECTED;
  } else if (requested && data.collections.some((c) => c.id === requested)) {
    id = requested;
  }

  const name =
    id === UNCOLLECTED
      ? 'Uncollected'
      : (data.collections.find((c) => c.id === id)?.name ?? 'Uncollected');

  const inBucket =
    id === UNCOLLECTED
      ? data.images.filter((i) => i.collection_id === null)
      : data.images.filter((i) => i.collection_id === id);
  const coverUrl = inBucket[0]?.thumb_url ?? null;

  return { id, name, coverUrl, isCanonical: requested === id };
}

type PinPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ c?: string }>;
};

export async function generateMetadata(
  { params, searchParams }: PinPageProps,
): Promise<Metadata> {
  const [{ id }, { c }] = await Promise.all([params, searchParams]);
  const data = await getPinData(id);
  if (!data) return { title: 'Wayprint' };

  const resolved = resolveCollection(data, c);
  const title = `${data.label} · ${resolved.name} · Wayprint`;
  const description = `${data.label} — ${resolved.name}.`;
  const images = resolved.coverUrl ? [resolved.coverUrl] : undefined;

  return {
    title,
    description,
    openGraph: { title, description, type: 'website', images },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}

export default async function PinPage({ params, searchParams }: PinPageProps) {
  const [{ id }, { c }] = await Promise.all([params, searchParams]);
  const data = await getPinData(id);
  if (!data) notFound();

  const resolved = resolveCollection(data, c);
  if (!resolved.isCanonical) {
    redirect(`/pin/${id}?c=${resolved.id}`);
  }

  return (
    <>
      <MapView initialPinId={id} initialCollectionId={resolved.id} />
      <div
        className="fixed top-4 left-4 flex items-start gap-2"
        style={{ zIndex: layers.ADMIN_SHEET - 5 }}
      >
        <AboutPanel />
        <div className="max-sm:peer-data-[state=open]:hidden">
          <LastUpdated />
        </div>
      </div>
    </>
  );
}
