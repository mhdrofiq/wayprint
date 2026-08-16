import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import MapView from '@/components/map/MapView';
import AboutPanel from '@/components/AboutPanel';
import LastUpdated from '@/components/LastUpdated';
import { layers } from '@/lib/layers';
import { supabase } from '@/lib/supabase';

export const revalidate = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Cached per-request so generateMetadata and the page component share one DB round-trip.
const getPinPreview = cache(async (id: string) => {
  if (!UUID_RE.test(id)) return null;

  const [pinRes, imgRes] = await Promise.all([
    supabase.from('pins').select('id, label').eq('id', id).maybeSingle(),
    supabase
      .from('images')
      .select('thumb_url')
      .eq('pin_id', id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!pinRes.data) return null;
  return {
    label: pinRes.data.label,
    coverUrl: imgRes.data?.thumb_url ?? null,
  };
});

type PinPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata(
  { params }: PinPageProps,
): Promise<Metadata> {
  const { id } = await params;
  const data = await getPinPreview(id);
  if (!data) return { title: 'Wayprint' };

  const title = `${data.label} · Wayprint`;
  const description = 'A pin on Wayprint.';
  const images = data.coverUrl ? [data.coverUrl] : undefined;

  return {
    title,
    description,
    openGraph: { title, description, type: 'website', images },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}

export default async function PinPage({ params }: PinPageProps) {
  const { id } = await params;
  const data = await getPinPreview(id);
  if (!data) notFound();

  return (
    <>
      <MapView initialPinId={id} />
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
