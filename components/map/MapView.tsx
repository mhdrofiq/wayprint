'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useState } from 'react';
import { Map, Popup } from '@vis.gl/react-maplibre';
import type { Pin } from '@/types';
import PinMarker from './PinMarker';

const PINS: Pin[] = [
  { id: '1', label: 'Shinjuku, Tokyo', lat: 35.6896, lng: 139.6917 },
  { id: '2', label: 'Gion, Kyoto', lat: 35.0035, lng: 135.7751 },
  { id: '3', label: 'Dotonbori, Osaka', lat: 34.6687, lng: 135.5019 },
  { id: '4', label: 'Odori Park, Sapporo', lat: 43.0620, lng: 141.3544 },
  { id: '5', label: 'Peace Memorial Park, Hiroshima', lat: 34.3955, lng: 132.4536 },
];

export default function MapView() {
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);

  return (
    <div className="fixed inset-2 rounded-xl overflow-hidden shadow-sm">
      <Map
        initialViewState={{
          longitude: 139.69,
          latitude: 35.68,
          zoom: 11,
        }}
        mapStyle={process.env.NEXT_PUBLIC_MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
        onClick={() => setSelectedPin(null)}
      >
        {PINS.map((pin) => (
          <PinMarker
            key={pin.id}
            pin={pin}
            isSelected={selectedPin?.id === pin.id}
            onClick={() => setSelectedPin(pin)}
          />
        ))}

        {selectedPin && (
          <Popup
            longitude={selectedPin.lng}
            latitude={selectedPin.lat}
            onClose={() => setSelectedPin(null)}
            closeOnClick={false}
            anchor="bottom"
            offset={12}
          >
            <span className="text-sm font-medium">{selectedPin.label}</span>
          </Popup>
        )}
      </Map>
    </div>
  );
}
