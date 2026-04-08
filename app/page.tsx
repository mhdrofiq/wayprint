import MapView from '@/components/map/MapView';
import AboutPanel from '@/components/AboutPanel';
import LastUpdated from '@/components/LastUpdated';
import { layers } from '@/lib/layers';

export default function Home() {
  return (
    <>
      <MapView />
      <div
        className="fixed top-4 left-4 flex items-start gap-2"
        style={{ zIndex: layers.ADMIN_SHEET - 5 }}
      >
        <AboutPanel />
        <LastUpdated />
      </div>
    </>
  );
}
