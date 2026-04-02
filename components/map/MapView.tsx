'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useState } from 'react';
import { Map, Popup } from '@vis.gl/react-maplibre';
import type { Pin, Image, ScreenPos } from '@/types';
import PinMarker from './PinMarker';
import PhotoBurstSwitch from '@/components/burst/PhotoBurstSwitch';

const PINS: Pin[] = [
  { id: '1', label: 'Shinjuku, Tokyo', lat: 35.6896, lng: 139.6917 },
  { id: '2', label: 'Gion, Kyoto', lat: 35.0035, lng: 135.7751 },
  { id: '3', label: 'Dotonbori, Osaka', lat: 34.6687, lng: 135.5019 },
  { id: '4', label: 'Odori Park, Sapporo', lat: 43.0620, lng: 141.3544 },
  { id: '5', label: 'Peace Memorial Park, Hiroshima', lat: 34.3955, lng: 132.4536 },
];

const IMAGES: Record<string, Image[]> = {
  '1': [
    { id: 'i1', pin_id: '1', url: '/photos/photo-1.svg', thumb_url: '/photos/photo-1.svg', caption: 'Golden Gai at night', sort_order: 0 },
    { id: 'i2', pin_id: '1', url: '/photos/photo-2.svg', thumb_url: '/photos/photo-2.svg', caption: 'Kabukicho neon lights', sort_order: 1 },
    { id: 'i3', pin_id: '1', url: '/photos/photo-3.svg', thumb_url: '/photos/photo-3.svg', caption: 'Shinjuku station east exit', sort_order: 2 },
  ],
  '2': [
    { id: 'i4', pin_id: '2', url: '/photos/photo-2.svg', thumb_url: '/photos/photo-2.svg', caption: 'Hanamikoji street', sort_order: 0 },
    { id: 'i5', pin_id: '2', url: '/photos/photo-4.svg', thumb_url: '/photos/photo-4.svg', caption: 'Geisha district lanterns', sort_order: 1 },
  ],
  '3': [
    { id: 'i6', pin_id: '3', url: '/photos/photo-3.svg', thumb_url: '/photos/photo-3.svg', caption: 'Dotonbori canal', sort_order: 0 },
    { id: 'i7', pin_id: '3', url: '/photos/photo-5.svg', thumb_url: '/photos/photo-5.svg', caption: 'Glico running man sign', sort_order: 1 },
    { id: 'i8', pin_id: '3', url: '/photos/photo-1.svg', thumb_url: '/photos/photo-1.svg', caption: 'Takoyaki stall', sort_order: 2 },
    { id: 'i9', pin_id: '3', url: '/photos/photo-2.svg', thumb_url: '/photos/photo-2.svg', caption: 'Ebisu Bridge', sort_order: 3 },
  ],
  '4': [
    { id: 'i10', pin_id: '4', url: '/photos/photo-4.svg', thumb_url: '/photos/photo-4.svg', caption: 'Odori Park in autumn', sort_order: 0 },
    { id: 'i11', pin_id: '4', url: '/photos/photo-5.svg', thumb_url: '/photos/photo-5.svg', caption: 'Sapporo TV Tower', sort_order: 1 },
  ],
  '5': [
    { id: 'i12', pin_id: '5', url: '/photos/photo-5.svg', thumb_url: '/photos/photo-5.svg', caption: 'Atomic Bomb Dome', sort_order: 0 },
    { id: 'i13', pin_id: '5', url: '/photos/photo-1.svg', thumb_url: '/photos/photo-1.svg', caption: 'Peace Bell', sort_order: 1 },
    { id: 'i14', pin_id: '5', url: '/photos/photo-3.svg', thumb_url: '/photos/photo-3.svg', caption: 'Paper cranes memorial', sort_order: 2 },
  ],
};

export default function MapView() {
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [selectedPinScreenPos, setSelectedPinScreenPos] = useState<ScreenPos | null>(null);
  const [hoveredPin, setHoveredPin] = useState<Pin | null>(null);

  function handlePinClick(pin: Pin, screenPos: ScreenPos) {
    setSelectedPin(pin);
    setSelectedPinScreenPos(screenPos);
    setHoveredPin(null);
  }

  function handleClose() {
    setSelectedPin(null);
    setSelectedPinScreenPos(null);
  }

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
        onClick={handleClose}
        scrollZoom={selectedPin === null}
        dragPan={selectedPin === null}
        dragRotate={selectedPin === null}
        touchZoomRotate={selectedPin === null}
        doubleClickZoom={selectedPin === null}
      >
        {PINS.map((pin) => (
          <PinMarker
            key={pin.id}
            pin={pin}
            isSelected={selectedPin?.id === pin.id}
            onClick={(screenPos) => handlePinClick(pin, screenPos)}
            onHoverEnter={() => setHoveredPin(pin)}
            onHoverLeave={() => setHoveredPin(null)}
          />
        ))}

        {hoveredPin && !selectedPin && (
          <Popup
            longitude={hoveredPin.lng}
            latitude={hoveredPin.lat}
            closeOnClick={false}
            closeButton={false}
            anchor="bottom"
            offset={33}
          >
            <span className="text-sm font-medium">{hoveredPin.label}</span>
          </Popup>
        )}
      </Map>

      {selectedPin && selectedPinScreenPos && (
        <PhotoBurstSwitch
          pin={selectedPin}
          images={IMAGES[selectedPin.id] ?? []}
          pinScreenPos={selectedPinScreenPos}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
