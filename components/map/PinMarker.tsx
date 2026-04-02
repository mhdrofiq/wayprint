'use client';

import { Marker } from '@vis.gl/react-maplibre';
import type { Pin } from '@/types';

interface PinMarkerProps {
  pin: Pin;
  isSelected: boolean;
  onClick: () => void;
}

export default function PinMarker({ pin, isSelected, onClick }: PinMarkerProps) {
  return (
    <Marker longitude={pin.lng} latitude={pin.lat} anchor="bottom">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`text-2xl leading-none cursor-pointer transition-all select-none drop-shadow-md hover:scale-110 ${
          isSelected ? 'scale-125' : ''
        }`}
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }}
      >
        📍
      </button>
    </Marker>
  );
}
