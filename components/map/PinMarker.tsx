'use client';

import { useRef } from 'react';
import { Marker } from '@vis.gl/react-maplibre';
import type { Pin, ScreenPos } from '@/types';

interface PinMarkerProps {
  pin: Pin;
  isSelected: boolean;
  onClick: (screenPos: ScreenPos) => void;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
}

export default function PinMarker({ pin, isSelected, onClick, onHoverEnter, onHoverLeave }: PinMarkerProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    onClick({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }

  return (
    <Marker longitude={pin.lng} latitude={pin.lat} anchor="bottom">
      <button
        ref={btnRef}
        onClick={handleClick}
        onMouseEnter={onHoverEnter}
        onMouseLeave={onHoverLeave}
        className={`text-2xl leading-none cursor-pointer transition-all select-none hover:scale-110 ${
          isSelected ? 'scale-125' : ''
        }`}
        style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.12))' }}
      >
        📍
      </button>
    </Marker>
  );
}
