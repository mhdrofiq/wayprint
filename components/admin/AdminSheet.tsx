'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Pin, Image } from '@/types';
import { layers } from '@/lib/layers';
import PinEditor from './PinEditor';

const COLLAPSED_H = 48;

function snapTo(raw: number): number {
  const halfH = Math.round(window.innerHeight * 0.5);
  const fullH = Math.round(window.innerHeight * 0.7);
  const points = [COLLAPSED_H, halfH, fullH];
  return points.reduce((prev, curr) =>
    Math.abs(curr - raw) < Math.abs(prev - raw) ? curr : prev
  );
}

interface Props {
  pins: Pin[];
  selectedPin: Pin | null;
  images: Image[];
  token: string;
  isEditMode: boolean;
  onEditModeChange: (v: boolean) => void;
  onSelectPin: (pin: Pin | null) => void;
  onPinUpdated: (pin: Pin) => void;
  onPinDeleted: (pinId: string) => void;
  onImagesChange: (updater: Image[] | ((prev: Image[]) => Image[])) => void;
  signOut: () => void;
  expandRequest?: number;
}

export default function AdminSheet({
  pins,
  selectedPin,
  images,
  token,
  isEditMode,
  onEditModeChange,
  onSelectPin,
  onPinUpdated,
  onPinDeleted,
  onImagesChange,
  signOut,
  expandRequest,
}: Props) {
  const [sheetHeight, setSheetHeight] = useState(COLLAPSED_H);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  // Ref kept in sync with state so pointer handlers can read the current height
  // without needing to be recreated on every change.
  const sheetHeightRef = useRef(sheetHeight);
  sheetHeightRef.current = sheetHeight;

  // Auto-expand when a pin is selected, edit mode is toggled on, or the
  // "open in sheet" burst button is clicked (expandRequest increments).
  // sheetHeight excluded from deps to avoid an infinite loop.
  useEffect(() => {
    if (expandRequest || ((selectedPin || isEditMode) && sheetHeightRef.current === COLLAPSED_H)) {
      setSheetHeight(Math.round(window.innerHeight * 0.5));
    }
  }, [selectedPin, isEditMode, expandRequest]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startHeight: sheetHeightRef.current };
    setIsDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const fullH = Math.round(window.innerHeight * 0.7);
    const delta = dragRef.current.startY - e.clientY; // drag up = positive = taller
    const raw = dragRef.current.startHeight + delta;
    setSheetHeight(Math.max(COLLAPSED_H, Math.min(fullH, raw)));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const delta = dragRef.current.startY - e.clientY;
    const raw = dragRef.current.startHeight + delta;
    dragRef.current = null;
    setIsDragging(false);
    setSheetHeight(snapTo(raw));
  }

  const isExpanded = sheetHeight > COLLAPSED_H;

  return (
    <motion.div
      className="fixed left-2 right-2 bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col"
      style={{ zIndex: layers.ADMIN_SHEET, bottom: 'calc(0.5rem + var(--sab))' }}
      animate={{ height: sheetHeight }}
      transition={isDragging
        ? { duration: 0 }
        : { type: 'spring', stiffness: 400, damping: 40 }
      }
    >
      {/* Handle — drag target */}
      <div
        className="flex justify-center items-center h-12 shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="w-10 h-1 rounded-full bg-zinc-300" />
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto px-4 pb-6 min-h-0">
          {selectedPin ? (
            <SelectedPinContent
              pin={selectedPin}
              pins={pins}
              images={images}
              token={token}
              onSelectPin={onSelectPin}
              onPinUpdated={onPinUpdated}
              onPinDeleted={onPinDeleted}
              onImagesChange={onImagesChange}
            />
          ) : (
            <NoSelectionContent
              pins={pins}
              isEditMode={isEditMode}
              onEditModeChange={onEditModeChange}
              onSelectPin={onSelectPin}
              signOut={signOut}
            />
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Selected-pin content (nav row + editor) ─────────────────────────────────

const ChevronLeft = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.5 2L3.5 6l4 4" />
  </svg>
);
const ChevronRight = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 2L8.5 6l-4 4" />
  </svg>
);

interface SelectedPinContentProps {
  pin: Pin;
  pins: Pin[];
  images: Image[];
  token: string;
  onSelectPin: (pin: Pin | null) => void;
  onPinUpdated: (pin: Pin) => void;
  onPinDeleted: (pinId: string) => void;
  onImagesChange: (updater: Image[] | ((prev: Image[]) => Image[])) => void;
}

function SelectedPinContent({ pin, pins, images, token, onSelectPin, onPinUpdated, onPinDeleted, onImagesChange }: SelectedPinContentProps) {
  const idx = pins.findIndex((p) => p.id === pin.id);
  return (
    <>
      {/* Navigation row */}
      <div className="flex items-center mb-3">
        <button
          onClick={() => onSelectPin(null)}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <ChevronLeft />
          All pins
        </button>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => onSelectPin(pins[idx - 1])}
            disabled={idx <= 0}
            className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            title="Previous pin"
          >
            <ChevronLeft />
          </button>
          <span className="text-xs text-zinc-400 tabular-nums w-10 text-center">
            {idx + 1} / {pins.length}
          </span>
          <button
            onClick={() => onSelectPin(pins[idx + 1])}
            disabled={idx >= pins.length - 1}
            className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            title="Next pin"
          >
            <ChevronRight />
          </button>
        </div>
      </div>
      <PinEditor
        key={pin.id}
        pin={pin}
        images={images}
        token={token}
        onPinUpdated={onPinUpdated}
        onPinDeleted={onPinDeleted}
        onImagesChange={onImagesChange}
      />
    </>
  );
}

// ─── No-pin-selected content ─────────────────────────────────────────────────

interface NoSelectionProps {
  pins: Pin[];
  isEditMode: boolean;
  onEditModeChange: (v: boolean) => void;
  onSelectPin: (pin: Pin | null) => void;
  signOut: () => void;
}

function NoSelectionContent({ pins, isEditMode, onEditModeChange, onSelectPin, signOut }: NoSelectionProps) {
  return (
    <div className="flex flex-col gap-4 py-1">
      {/* Edit mode toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-900 font-medium">Edit mode</p>
          {isEditMode && (
            <p className="text-xs text-zinc-500 mt-0.5">Tap the map to drop a new pin.</p>
          )}
        </div>
        <button
          onClick={() => onEditModeChange(!isEditMode)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            isEditMode
              ? 'bg-blue-500 text-white'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          }`}
        >
          {isEditMode ? 'On' : 'Off'}
        </button>
      </div>

      {/* Pin list */}
      {pins.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1 font-medium">
            {pins.length} {pins.length === 1 ? 'pin' : 'pins'}
          </p>
          {pins.map((pin) => (
            <button
              key={pin.id}
              onClick={() => onSelectPin(pin)}
              className="flex items-center gap-2.5 text-left py-2 px-3 rounded-lg hover:bg-zinc-100 transition-colors group"
            >
              <span className="text-base leading-none">📍</span>
              <span className="text-sm text-zinc-700 group-hover:text-zinc-900 truncate flex-1">
                {pin.label}
              </span>
              {pin.image_count !== undefined && pin.image_count > 0 && (
                <span className="text-xs text-zinc-400 shrink-0">{pin.image_count}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Sign out */}
      <button
        onClick={signOut}
        className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors text-left mt-1"
      >
        Sign out
      </button>
    </div>
  );
}
