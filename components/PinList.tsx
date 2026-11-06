'use client';

import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Pin } from '@/types';
import { layers, TOP_BAR_SLOT_ID } from '@/lib/layers';
import { sortNewestFirst } from '@/lib/pins';
import { useIsPhone } from '@/hooks/useIsPhone';

// The top bar's slot is in the server HTML and never moves, so there is
// nothing to subscribe to.
const subscribeNever = () => () => {};
const getTopBarSlot = () => document.getElementById(TOP_BAR_SLOT_ID);

interface PinListProps {
  pins: Pin[];
  hidden?: boolean;
  onPinFocus: (pin: Pin) => void;
}

export default function PinList({ pins, hidden, onPinFocus }: PinListProps) {
  const isPhone = useIsPhone();
  const [open, setOpen] = useState(false);
  // The toggle lives in the top bar, which the server renders outside MapView.
  const slot = useSyncExternalStore(subscribeNever, getTopBarSlot, () => null);

  if (hidden) return null;

  const sortedPins = sortNewestFirst(pins);

  function handlePinClick(pin: Pin) {
    onPinFocus(pin);
    if (isPhone) setOpen(false); // auto-close after a selection on mobile
  }

  const toggle = (
    <button
      onClick={() => setOpen((o) => !o)}
      aria-label={open ? 'Hide pin list' : 'Show pin list'}
      aria-expanded={open}
      className={`flex items-center gap-1.5 px-2.5 border-l border-tui-line cursor-pointer transition-colors ${
        open ? 'bg-tui-fg text-tui-bg' : 'hover:bg-tui-raised'
      }`}
    >
      <span className={open ? '' : 'text-tui-accent-text'} aria-hidden>≡</span>
      pins [{pins.length}]
    </button>
  );

  return (
    <>
      {slot && createPortal(toggle, slot)}

      <AnimatePresence>
        {open && (
          <motion.aside
            className="fixed right-0 w-80 max-w-full bg-tui-panel text-tui-fg border-l border-tui-line flex flex-col overflow-hidden text-xs"
            style={{
              zIndex: layers.ADMIN_SHEET,
              top: 'calc(var(--tui-top-h) + var(--sat))',
              bottom: 'calc(var(--tui-bottom-h) + var(--sab))',
            }}
            initial={isPhone ? { x: '100%' } : { opacity: 0 }}
            animate={isPhone ? { x: 0 } : { opacity: 1 }}
            exit={isPhone ? { x: '100%' } : { opacity: 0 }}
            transition={isPhone
              ? { type: 'spring', stiffness: 320, damping: 34 }
              : { duration: 0.15 }}
          >
            <div className="flex items-center gap-2 px-2.5 h-7 border-b border-tui-line shrink-0">
              <span className="font-bold">PINS</span>
              <span className="text-tui-dim">[{pins.length}]</span>
              <span className="flex-1" />
              <span className="text-tui-dim">newest ↓</span>
              <button
                className="border border-tui-line-strong w-5 h-5 flex items-center justify-center hover:bg-tui-fg hover:text-tui-bg cursor-pointer"
                onClick={() => setOpen(false)}
                aria-label="Hide pin list"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {sortedPins.map((pin, i) => (
                <button
                  key={pin.id}
                  onClick={() => handlePinClick(pin)}
                  className="group w-full flex items-center gap-2.5 text-left px-2.5 py-1.5 border-b border-tui-line/50 hover:bg-tui-fg hover:text-tui-bg cursor-pointer"
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
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
