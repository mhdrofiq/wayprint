import MapView from '@/components/map/MapView';
import TopLeftBar from '@/components/TopLeftBar';

export const revalidate = 60;

export default function Home() {
  return (
    <>
      <MapView />
      <TopLeftBar />
    </>
  );
}
