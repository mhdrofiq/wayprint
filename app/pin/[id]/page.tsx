import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import MapView from '@/components/map/MapView';
import TopLeftBar from '@/components/TopLeftBar';
import { supabase } from '@/lib/supabase';
import { isUuid } from '@/lib/ids';
import { UNCOLLECTED, type CollectionId } from '@/lib/collections';

export const revalidate = 60;

type PinData = {
  label: string;
  collections: { id: string; name: string }[];
  images: { collection_id: string | null; thumb_url: string }[];
};

// Cached per-request so generateMetadata and the page component share one DB round-trip.
const getPinData = cache(async (id: string): Promise<PinData | null> => {
  if (!isUuid(id)) return null;

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
      .select('collection_id, thumb_url')
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

type Resolved = {
  initialCollectionId: CollectionId | undefined;
  title: string;
  description: string;
  coverUrl: string | null;
};

// Turn the ?c= query into what we need for OG meta and MapView seeding.
// - Unknown/absent ?c= → pin-level view; let the hook pick its own default,
//   preview with an uncollected image (falling back to any image).
// - ?c=uncollected → same as above unless the pin genuinely has uncollected
//   images, in which case we pre-select that filter.
// - ?c=<valid-collection-uuid> → collection-scoped view.
function resolvePinView(data: PinData, requested: string | undefined): Resolved {
  const collection = requested
    ? data.collections.find((c) => c.id === requested)
    : undefined;

  if (collection) {
    const first = data.images.find((i) => i.collection_id === collection.id);
    return {
      initialCollectionId: collection.id,
      title: `${data.label} · ${collection.name} · Wayprint`,
      description: `${data.label} — ${collection.name}.`,
      coverUrl: first?.thumb_url ?? null,
    };
  }

  const firstUncollected = data.images.find((i) => i.collection_id === null);
  const coverUrl = firstUncollected?.thumb_url ?? data.images[0]?.thumb_url ?? null;
  const wantsUncollected = requested === UNCOLLECTED && firstUncollected;
  return {
    initialCollectionId: wantsUncollected ? UNCOLLECTED : undefined,
    title: `${data.label} · Wayprint`,
    description: `${data.label}.`,
    coverUrl,
  };
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

  const { title, description, coverUrl } = resolvePinView(data, c);
  const images = coverUrl ? [coverUrl] : undefined;

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

  const { initialCollectionId } = resolvePinView(data, c);

  return (
    <>
      <MapView initialPinId={id} initialCollectionId={initialCollectionId} />
      <TopLeftBar />
    </>
  );
}
