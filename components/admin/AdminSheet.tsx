'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Pin, Image, Collection, Updater, FreezeWhile } from '@/types';
import { layers } from '@/lib/layers';
import { sortNewestFirst } from '@/lib/pins';
import { countLabel } from '@/lib/utils';
import { useIsPhone } from '@/hooks/useIsPhone';
import PinEditor from './PinEditor';
import { cell, cellAccent, cellOn, sectionLabel } from './tui';

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
  /** The selected pin's photos are still loading. */
  imagesLoading: boolean;
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
  imagesLoading,
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
  // null = idle; otherwise the panel is frozen, with an optional status line.
  const [busy, setBusy] = useState<{ status: string | null } | null>(null);

  const freezeWhile: FreezeWhile = async (task) => {
    setBusy({ status: null });
    try {
      await task((status) => setBusy({ status }));
    } finally {
      setBusy(null);
    }
  };

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
  // measured pill) so the top bar starts beside it.
  // Reset on phones and on unmount (sign-out).
  useEffect(() => {
    const root = document.documentElement;
    let width = 0;
    if (!isPhone) {
      width = isOpen ? PANEL_W : (pillRef.current?.offsetWidth ?? 0);
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
      imagesLoading={imagesLoading}
      token={token}
      onSelectPin={onSelectPin}
      onPinUpdated={onPinUpdated}
      onPinDeleted={onPinDeleted}
      onImagesChange={onImagesChange}
      onCollectionsChange={onCollectionsChange}
      freezeWhile={freezeWhile}
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
            className="fixed top-0 left-0 flex items-center px-2.5 bg-tui-fg text-tui-bg text-xs font-bold border-b border-r border-tui-line hover:bg-tui-accent hover:text-tui-accent-fg transition-colors whitespace-nowrap cursor-pointer"
            style={{ zIndex: layers.ADMIN_SHEET, height: 'calc(var(--tui-top-h) + var(--sat))', paddingTop: 'var(--sat)' }}
          >
            Admin
          </button>
        )}

        <AnimatePresence>
          {isOpen && (
            <motion.aside
              className="fixed left-0 top-0 bg-tui-panel text-tui-fg text-xs border-r border-tui-line flex flex-col overflow-hidden"
              style={{ zIndex: layers.ADMIN_SHEET, width: PANEL_W, bottom: 'calc(var(--tui-bottom-h) + var(--sab))' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div inert={busy !== null} className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center gap-2 px-2.5 h-7 border-b border-tui-line shrink-0">
                  <span className="font-bold flex-1">ADMIN</span>
                  <button
                    className="border border-tui-line-strong w-5 h-5 flex items-center justify-center hover:bg-tui-fg hover:text-tui-bg cursor-pointer"
                    onClick={() => setIsOpen(false)}
                    aria-label="Hide admin panel"
                  >
                    ×
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-2.5 pt-2.5 pb-6 min-h-0">
                  {content}
                </div>
              </div>
              {busy && <BusyOverlay status={busy.status} />}
            </motion.aside>
          )}
        </AnimatePresence>
      </>
    );
  }

  // ── Phone: bottom sheet with a collapse handle ────────────────────────────
  return (
    <motion.div
      className="fixed left-0 right-0 bg-tui-panel text-tui-fg text-xs border-t border-tui-line overflow-hidden flex flex-col"
      style={{ zIndex: layers.ADMIN_SHEET, bottom: 'calc(var(--tui-bottom-h) + var(--sab))' }}
      animate={{ height: sheetHeight }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
    >
      <div inert={busy !== null} className="flex flex-col flex-1 min-h-0">
        <button
          className="flex justify-center items-center gap-2 h-12 shrink-0 w-full border-b border-tui-line hover:bg-tui-raised transition-colors cursor-pointer"
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? 'Collapse admin panel' : 'Expand admin panel'}
        >
          <span className="font-bold">ADMIN</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-tui-dim">
            <path d={isOpen ? 'M3 5.5l5 5 5-5' : 'M3 10.5l5-5 5 5'} />
          </svg>
        </button>

        {isOpen && (
          <div className="flex-1 overflow-y-auto px-2.5 pt-2.5 pb-6 min-h-0">
            {content}
          </div>
        )}
      </div>
      {busy && <BusyOverlay status={busy.status} />}
    </motion.div>
  );
}

const SPINNER_FRAMES = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';

/** A terminal-style braille spinner. */
function Spinner() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 80);
    return () => clearInterval(id);
  }, []);
  return <span className="text-tui-accent-text font-bold" aria-hidden>{SPINNER_FRAMES[frame]}</span>;
}

// Covers the whole panel while an operation runs; the panel underneath is inert.
function BusyOverlay({ status }: { status: string | null }) {
  return (
    <div
      role="status"
      aria-label={status ?? 'Working'}
      className="absolute inset-0 bg-tui-bg/80 flex items-center justify-center px-4 cursor-wait"
    >
      <div className="flex items-center gap-2 bg-tui-panel border border-tui-fg px-3 py-2 tabular-nums">
        <Spinner />
        <span>{status ?? 'working…'}</span>
      </div>
    </div>
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
  imagesLoading: boolean;
  token: string;
  onSelectPin: (pin: Pin | null) => void;
  onPinUpdated: (pin: Pin) => void;
  onPinDeleted: (pinId: string) => void;
  onImagesChange: Updater<Image[]>;
  onCollectionsChange: Updater<Collection[]>;
  freezeWhile: FreezeWhile;
}

function SelectedPinContent({ pin, pins, images, collections, imagesLoading, token, onSelectPin, onPinUpdated, onPinDeleted, onImagesChange, onCollectionsChange, freezeWhile }: SelectedPinContentProps) {
  const idx = pins.findIndex((p) => p.id === pin.id);
  return (
    <>
      {/* Navigation row */}
      <div className="flex items-center gap-1.5 mb-3">
        <button onClick={() => onSelectPin(null)} className={cell}>
          ‹ All pins
        </button>
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => onSelectPin(pins[idx - 1])}
            disabled={idx <= 0}
            className={cell}
            title="Previous pin"
          >
            <ChevronLeft />
          </button>
          <span className="text-tui-dim tabular-nums px-1">
            {idx + 1} / {pins.length}
          </span>
          <button
            onClick={() => onSelectPin(pins[idx + 1])}
            disabled={idx >= pins.length - 1}
            className={cell}
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
        loading={imagesLoading}
        token={token}
        onPinUpdated={onPinUpdated}
        onPinDeleted={onPinDeleted}
        onImagesChange={onImagesChange}
        onCollectionsChange={onCollectionsChange}
        freezeWhile={freezeWhile}
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
          className={isEditMode ? cellAccent : cell}
        >
          {isEditMode ? 'Editing' : 'Edit'}
        </button>
        <button
          onClick={() => setSort('date')}
          className={sort === 'date' ? cellOn : cell}
          title="Sort by date added"
        >
          Date
        </button>
        <button
          onClick={() => setSort('alpha')}
          className={sort === 'alpha' ? cellOn : cell}
          title="Sort alphabetically"
        >
          A–Z
        </button>
        <button onClick={signOut} className={`${cell} ml-auto`}>
          Sign out
        </button>
      </div>

      {/* Pin list */}
      {pins.length > 0 && (
        <div className="flex flex-col">
          <p className={`${sectionLabel} mb-1`}>
            {countLabel(pins.length, 'pin')}
          </p>
          <div className="border-t border-tui-line">
            {sortedPins.map((pin, i) => (
              <button
                key={pin.id}
                onClick={() => onSelectPin(pin)}
                className="group w-full flex items-center gap-2.5 text-left px-2 py-1.5 border-b border-tui-line/50 hover:bg-tui-fg hover:text-tui-bg cursor-pointer"
              >
                <span className="text-tui-dim group-hover:text-tui-bg/60 tabular-nums w-[2ch] shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="truncate flex-1">{pin.label}</span>
                {pin.image_count !== undefined && pin.image_count > 0 && (
                  <span className="text-tui-dim group-hover:text-tui-bg/60 tabular-nums shrink-0">{pin.image_count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
