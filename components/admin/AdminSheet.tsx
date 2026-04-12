'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Pin, Image, Collection } from '@/types';
import { layers } from '@/lib/layers';
import PinEditor from './PinEditor';

const COLLAPSED_H = 48;
const expandedH = () => Math.round(window.innerHeight * 0.5);

interface Props {
  pins: Pin[];
  selectedPin: Pin | null;
  images: Image[];
  collections: Collection[];
  token: string;
  isEditMode: boolean;
  onEditModeChange: (v: boolean) => void;
  onSelectPin: (pin: Pin | null) => void;
  onPinUpdated: (pin: Pin) => void;
  onPinDeleted: (pinId: string) => void;
  onImagesChange: (updater: Image[] | ((prev: Image[]) => Image[])) => void;
  onCollectionsChange: (updater: Collection[] | ((prev: Collection[]) => Collection[])) => void;
  signOut: () => void;
  expandRequest?: number;
}

export default function AdminSheet({
  pins,
  selectedPin,
  images,
  collections,
  token,
  isEditMode,
  onEditModeChange,
  onSelectPin,
  onPinUpdated,
  onPinDeleted,
  onImagesChange,
  onCollectionsChange,
  signOut,
  expandRequest,
}: Props) {
  const [sheetHeight, setSheetHeight] = useState(COLLAPSED_H);
  const sheetHeightRef = useRef(sheetHeight);
  sheetHeightRef.current = sheetHeight;

  const isExpanded = sheetHeight > COLLAPSED_H;

  function toggle() {
    setSheetHeight(isExpanded ? COLLAPSED_H : expandedH());
  }

  // Auto-expand when a pin is selected, edit mode is toggled on, or the
  // "open in sheet" burst button is clicked (expandRequest increments).
  // sheetHeight excluded from deps to avoid an infinite loop.
  useEffect(() => {
    if (expandRequest || ((selectedPin || isEditMode) && sheetHeightRef.current === COLLAPSED_H)) {
      setSheetHeight(expandedH());
    }
  }, [selectedPin, isEditMode, expandRequest]);

  return (
    <motion.div
      className="fixed left-2 right-2 bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col"
      style={{ zIndex: layers.ADMIN_SHEET, bottom: 'calc(0.5rem + var(--sab))' }}
      animate={{ height: sheetHeight }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
    >
      {/* Toggle button */}
      <button
        className="flex justify-center items-center h-12 shrink-0 w-full hover:bg-zinc-50 transition-colors"
        onClick={toggle}
        aria-label={isExpanded ? 'Collapse admin panel' : 'Expand admin panel'}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
          {isExpanded
            ? <path d="M3 5.5l5 5 5-5" />
            : <path d="M3 10.5l5-5 5 5" />
          }
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto px-4 pb-6 min-h-0">
          {selectedPin ? (
            <SelectedPinContent
              pin={selectedPin}
              pins={pins}
              images={images}
              collections={collections}
              token={token}
              onSelectPin={onSelectPin}
              onPinUpdated={onPinUpdated}
              onPinDeleted={onPinDeleted}
              onImagesChange={onImagesChange}
              onCollectionsChange={onCollectionsChange}
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
  collections: Collection[];
  token: string;
  onSelectPin: (pin: Pin | null) => void;
  onPinUpdated: (pin: Pin) => void;
  onPinDeleted: (pinId: string) => void;
  onImagesChange: (updater: Image[] | ((prev: Image[]) => Image[])) => void;
  onCollectionsChange: (updater: Collection[] | ((prev: Collection[]) => Collection[])) => void;
}

function SelectedPinContent({ pin, pins, images, collections, token, onSelectPin, onPinUpdated, onPinDeleted, onImagesChange, onCollectionsChange }: SelectedPinContentProps) {
  const idx = pins.findIndex((p) => p.id === pin.id);
  return (
    <>
      {/* Navigation row */}
      <div className="flex items-center gap-1.5 mb-3">
        <button onClick={() => onSelectPin(null)} className={pillDefault}>
          All pins
        </button>
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => onSelectPin(pins[idx - 1])}
            disabled={idx <= 0}
            className={`${pillDefault} disabled:opacity-30 disabled:cursor-not-allowed`}
            title="Previous pin"
          >
            <ChevronLeft />
          </button>
          <span className={`${pill} bg-zinc-100 text-zinc-600 tabular-nums`}>
            {idx + 1} / {pins.length}
          </span>
          <button
            onClick={() => onSelectPin(pins[idx + 1])}
            disabled={idx >= pins.length - 1}
            className={`${pillDefault} disabled:opacity-30 disabled:cursor-not-allowed`}
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
        collections={collections}
        token={token}
        onPinUpdated={onPinUpdated}
        onPinDeleted={onPinDeleted}
        onImagesChange={onImagesChange}
        onCollectionsChange={onCollectionsChange}
      />
    </>
  );
}

// ─── Shared pill styles ───────────────────────────────────────────────────────

const pill = 'px-3 py-1.5 rounded-full text-xs font-medium transition-colors';
const pillDefault = `${pill} bg-zinc-100 text-zinc-600 hover:bg-zinc-200`;

// ─── No-pin-selected content ─────────────────────────────────────────────────

interface NoSelectionProps {
  pins: Pin[];
  isEditMode: boolean;
  onEditModeChange: (v: boolean) => void;
  onSelectPin: (pin: Pin | null) => void;
  signOut: () => void;
}

function NoSelectionContent({ pins, isEditMode, onEditModeChange, onSelectPin, signOut }: NoSelectionProps) {
  const [sort, setSort] = useState<'date' | 'alpha'>('date');

  const sortedPins = [...pins].sort((a, b) =>
    sort === 'alpha'
      ? a.label.localeCompare(b.label)
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="flex flex-col gap-3 py-1">
      {/* Controls row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => onEditModeChange(!isEditMode)}
          className={isEditMode ? `${pill} bg-blue-500 text-white` : pillDefault}
        >
          {isEditMode ? 'Editing' : 'Edit'}
        </button>
        <button
          onClick={() => setSort('date')}
          className={sort === 'date' ? `${pill} bg-zinc-800 text-white` : pillDefault}
          title="Sort by date added"
        >
          Date
        </button>
        <button
          onClick={() => setSort('alpha')}
          className={sort === 'alpha' ? `${pill} bg-zinc-800 text-white` : pillDefault}
          title="Sort alphabetically"
        >
          A–Z
        </button>
        <button onClick={signOut} className={`${pillDefault} ml-auto`}>
          Sign out
        </button>
      </div>

      {/* Pin list */}
      {pins.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium mb-1">
            {pins.length} {pins.length === 1 ? 'pin' : 'pins'}
          </p>
          {sortedPins.map((pin) => (
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
    </div>
  );
}
