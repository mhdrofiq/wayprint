'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useState } from 'react';
import { Map, Popup } from '@vis.gl/react-maplibre';
import type { Pin, ScreenPos } from '@/types';
import { PINS, IMAGES } from '@/lib/mock-data';
import PinMarker from './PinMarker';
import PhotoBurstSwitch from '@/components/burst/PhotoBurstSwitch';

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
