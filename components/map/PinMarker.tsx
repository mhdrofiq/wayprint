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
    <Marker longitude={pin.lng} latitude={pin.lat} anchor="center">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`w-4 h-4 rounded-full border-2 transition-all cursor-pointer ${
          isSelected
            ? 'bg-white border-black scale-125'
            : 'bg-black border-white hover:scale-110'
        }`}
      />
    </Marker>
  );
}
