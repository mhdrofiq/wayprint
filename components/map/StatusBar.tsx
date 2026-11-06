'use client';

import { useEffect, useState } from 'react';
import type { MapRef } from '@vis.gl/react-maplibre';
import { useIsPhone } from '@/hooks/useIsPhone';

interface StatusBarProps {
  mapRef: React.RefObject<MapRef | null>;
  mapLoaded: boolean;
  isEditMode: boolean;
}

interface View {
  lat: number;
  lng: number;
  zoom: number;
}

const ATTRIBUTION = [
  { href: 'https://openfreemap.org', label: 'OpenFreeMap', short: 'OFM' },
  { href: 'https://www.openmaptiles.org/', label: '© OpenMapTiles', short: '© OMT' },
  { href: 'https://www.openstreetmap.org/copyright', label: '© OpenStreetMap', short: '© OSM' },
];

/** One-line bar under the map: the map centre and zoom, a hint for what to do
 *  next, and the map data attribution. Owns its own state so map movement only
 *  re-renders this bar, not the whole map. */
export default function StatusBar({ mapRef, mapLoaded, isEditMode }: StatusBarProps) {
  const isPhone = useIsPhone();
  const [view, setView] = useState<View | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      const { lat, lng } = map.getCenter();
      setView({ lat, lng, zoom: map.getZoom() });
    };
    const onMove = () => { if (!frame) frame = requestAnimationFrame(read); };
    read();
    map.on('move', onMove);
    return () => {
      map.off('move', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mapRef, mapLoaded]);

  const hint = isEditMode
    ? 'edit mode · click the map to add a pin'
    : isPhone
      ? 'tap a pin to open'
      : 'hover a pin to preview · click to open';

  const seg = 'flex items-center px-2.5 border-r border-tui-line';

  return (
    <footer
      className="fixed left-0 right-0 bottom-0 flex items-stretch bg-tui-panel text-tui-dim border-t border-tui-line text-[11px] whitespace-nowrap overflow-hidden"
      style={{ height: 'calc(var(--tui-bottom-h) + var(--sab))', paddingBottom: 'var(--sab)' }}
    >
      {view && (
        <>
          <div className={`${seg} tabular-nums`}>
            {view.lat.toFixed(4)}N {view.lng.toFixed(4)}E
          </div>
          <div className={`${seg} tabular-nums`}>z{view.zoom.toFixed(1)}</div>
        </>
      )}
      <div className={`${seg} min-w-0 max-sm:hidden`}>
        <span className="truncate">{hint}</span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-1.5 px-2.5 border-l border-tui-line">
        {ATTRIBUTION.map((a) => (
          <a key={a.href} href={a.href} target="_blank" rel="noopener noreferrer" className="hover:text-tui-fg">
            {isPhone ? a.short : a.label}
          </a>
        ))}
      </div>
    </footer>
  );
}
