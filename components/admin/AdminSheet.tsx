'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Pin, Image, Collection, Updater } from '@/types';
import { layers } from '@/lib/layers';
import { sortNewestFirst } from '@/lib/pins';
import { countLabel } from '@/lib/utils';
import { useIsPhone } from '@/hooks/useIsPhone';
import PinEditor from './PinEditor';

// Phone: bottom sheet that collapses to a 48px handle.
const COLLAPSED_H = 48;
// Desktop: left panel toggled by a top-left pill (mirrors the public PinList).
const PANEL_W = 400;

/** CSS variable read by the top-left About / LastUpdated row so it sits to
 *  the right of whatever the admin UI occupies (pill or open panel). 0 on phones. */
const PANEL_WIDTH_VAR = '--admin-panel-w';

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
  onImagesChange: Updater<Image[]>;
  onCollectionsChange: Updater<Collection[]>;
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
  const isPhone = useIsPhone();
  const [isOpen, setIsOpen] = useState(false);
  const [vh, setVh] = useState(() => typeof window !== 'undefined' ? window.innerHeight : 800);
  const pillRef = useRef<HTMLButtonElement>(null);

  // Track viewport height so the phone sheet refits on rotate / resize.
  // Desktop doesn't use it, so skip the listener (and the re-renders) there.
  useEffect(() => {
    if (!isPhone) return;
    const update = () => setVh(window.innerHeight);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isPhone]);

  // Landscape phones (short viewports) fill nearly all the space, leaving
  // the About / LastUpdated row visible at the top. Taller viewports keep 50%.
  const expandedHeight = vh < 500 ? vh - 64 : Math.round(vh * 0.5);
  const sheetHeight = isOpen ? expandedHeight : COLLAPSED_H;

  // Publish how much of the top-left the admin UI occupies (open panel, or the
  // measured pill + an 8px gap) so the About / LastUpdated row sits beside it.
  // Reset on phones and on unmount (sign-out).
  useEffect(() => {
    const root = document.documentElement;
    let width = 0;
    if (!isPhone) {
      width = isOpen ? PANEL_W : (pillRef.current?.offsetWidth ?? 0) + 8;
    }
    root.style.setProperty(PANEL_WIDTH_VAR, `${width}px`);
    return () => root.style.setProperty(PANEL_WIDTH_VAR, '0px');
  }, [isPhone, isOpen]);

  // Auto-open when a pin is selected, edit mode is toggled on, or the
  // "open in sheet" burst button is clicked (expandRequest increments).
  // Only these three trigger it, so a manual close isn't undone.
  useEffect(() => {
    if (expandRequest || selectedPin || isEditMode) {
      setIsOpen(true);
    }
  }, [selectedPin, isEditMode, expandRequest]);

  const content = selectedPin ? (
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
  );

  // ── Desktop: top-left pill that reveals a full-height left panel ──────────
  if (!isPhone) {
    return (
      <>
        {!isOpen && (
          <button
            ref={pillRef}
            onClick={() => setIsOpen(true)}
            aria-label="Show admin panel"
            className="fixed top-4 left-4 bg-white/40 backdrop-blur-sm rounded-lg shadow-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-white/60 transition-colors whitespace-nowrap"
            style={{ zIndex: layers.ADMIN_SHEET }}
          >
            Admin
          </button>
        )}

        <AnimatePresence>
          {isOpen && (
            <motion.aside
              className="fixed left-2 top-2 bg-white rounded-r-lg shadow-md flex flex-col overflow-hidden"
              style={{ zIndex: layers.ADMIN_SHEET, width: PANEL_W, bottom: 'calc(0.5rem + var(--sab))' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex items-center px-4 py-3 shrink-0">
                <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium flex-1">Admin</p>
                <button
                  className="text-zinc-500 hover:text-zinc-900 text-xl leading-none w-6 h-6 flex items-center justify-center"
                  onClick={() => setIsOpen(false)}
                  aria-label="Hide admin panel"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-6 min-h-0">
                {content}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </>
    );
  }

  // ── Phone: bottom sheet with a collapse handle ────────────────────────────
  return (
    <motion.div
      className="fixed left-2 right-2 bg-white border border-zinc-200 rounded-lg overflow-hidden flex flex-col"
      style={{ zIndex: layers.ADMIN_SHEET, bottom: 'calc(0.5rem + var(--sab))' }}
      animate={{ height: sheetHeight }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
    >
      <button
        className="flex justify-center items-center h-12 shrink-0 w-full hover:bg-zinc-50 transition-colors"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? 'Collapse admin panel' : 'Expand admin panel'}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
          <path d={isOpen ? 'M3 5.5l5 5 5-5' : 'M3 10.5l5-5 5 5'} />
        </svg>
      </button>

      {isOpen && (
        <div className="flex-1 overflow-y-auto px-4 pb-6 min-h-0">
          {content}
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
  onImagesChange: Updater<Image[]>;
  onCollectionsChange: Updater<Collection[]>;
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

  const sortedPins = sort === 'alpha'
    ? [...pins].sort((a, b) => a.label.localeCompare(b.label))
    : sortNewestFirst(pins);

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
            {countLabel(pins.length, 'pin')}
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
