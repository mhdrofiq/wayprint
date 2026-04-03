'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useState, useEffect } from 'react';
import { Map, Popup } from '@vis.gl/react-maplibre';
import type { Pin, Image, ScreenPos } from '@/types';
import PinMarker from './PinMarker';
import PhotoBurstSwitch from '@/components/burst/PhotoBurstSwitch';

export default function MapView() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [selectedPinScreenPos, setSelectedPinScreenPos] = useState<ScreenPos | null>(null);
  const [selectedPinImages, setSelectedPinImages] = useState<Image[]>([]);
  const [hoveredPin, setHoveredPin] = useState<Pin | null>(null);

  // Load all pins on mount
  useEffect(() => {
    fetch('/api/pins')
      .then((res) => res.json())
      .then((data) => setPins(data))
      .catch(console.error);
  }, []);

  // Load images whenever a pin is selected
  useEffect(() => {
    if (!selectedPin) {
      setSelectedPinImages([]);
      return;
    }
    fetch(`/api/pins/${selectedPin.id}/images`)
      .then((res) => res.json())
      .then((data) => setSelectedPinImages(data))
      .catch(console.error);
  }, [selectedPin]);

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
        {pins.map((pin) => (
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
          images={selectedPinImages}
          pinScreenPos={selectedPinScreenPos}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
