import MapView from '@/components/map/MapView';
import TopLeftBar from '@/components/TopLeftBar';
import { getCachedPins } from '@/lib/cached-queries';
import { preloadMapStyle } from '@/lib/preload-map';

export const revalidate = 60;

export default async function Home() {
  preloadMapStyle();
  // Pins ship in the HTML so markers appear as soon as the map does. If the
  // database is unreachable, MapView falls back to fetching them itself.
  const pins = await getCachedPins().catch(() => undefined);

  return (
    <>
      <MapView initialPins={pins} />
      <TopLeftBar />
    </>
  );
}
