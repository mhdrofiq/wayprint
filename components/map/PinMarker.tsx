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
  /** Pointer down, before the click lands — a head start on touch screens. */
  onPressStart: () => void;
}

export default function PinMarker({ pin, isSelected, onClick, onHoverEnter, onHoverLeave, onPressStart }: PinMarkerProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    onClick({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }

  // A 28px hit area (easy to tap) around a small amber square.
  return (
    <Marker longitude={pin.lng} latitude={pin.lat} anchor="center">
      <button
        ref={btnRef}
        onClick={handleClick}
        onMouseEnter={onHoverEnter}
        onMouseLeave={onHoverLeave}
        onPointerDown={onPressStart}
        aria-label={pin.label}
        className="group w-7 h-7 flex items-center justify-center cursor-pointer select-none"
      >
        <span
          className={`block transition-all border-2 border-[#111] ${
            isSelected
              ? 'w-4 h-4 bg-[#111] outline-2 outline-tui-accent'
              : 'w-3 h-3 bg-tui-accent outline-1 outline-tui-accent group-hover:scale-125'
          }`}
        />
      </button>
    </Marker>
  );
}
