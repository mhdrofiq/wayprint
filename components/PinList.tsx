'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Pin } from '@/types';
import { layers } from '@/lib/layers';

// Layout-viewport-based phone check (matches the burst/cascade breakpoint
// so this behavior tracks the same form-factor distinction).
const PHONE_QUERY = '(max-width: 767px), (max-height: 500px)';
function useIsPhone() {
  const [isPhone, setIsPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches);
  useEffect(() => {
    const mql = window.matchMedia(PHONE_QUERY);
    const onChange = () => setIsPhone(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isPhone;
}

interface PinListProps {
  pins: Pin[];
  hidden?: boolean;
  onPinFocus: (pin: Pin) => void;
}

export default function PinList({ pins, hidden, onPinFocus }: PinListProps) {
  const isPhone = useIsPhone();
  const [open, setOpen] = useState(false);

  if (hidden) return null;

  const sortedPins = [...pins].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  function handlePinClick(pin: Pin) {
    onPinFocus(pin);
    if (isPhone) setOpen(false); // auto-close after a selection on mobile
  }

  return (
    <>
      {/* Collapsed affordance — chevron handle on phone, labeled pill on desktop */}
      {!open && (isPhone ? (
        <button
          onClick={() => setOpen(true)}
          aria-label="Show pin list"
          className="fixed top-1/2 -translate-y-1/2 right-3 bg-white/40 backdrop-blur-sm rounded-l-lg shadow-md px-1.5 py-4 text-zinc-700 hover:bg-white/60 transition-colors"
          style={{ zIndex: layers.ADMIN_SHEET }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 3l-4 4 4 4" />
          </svg>
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          aria-label="Show pin list"
          className="fixed top-4 right-4 bg-white/40 backdrop-blur-sm rounded-lg shadow-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-white/60 transition-colors flex items-center gap-2 whitespace-nowrap"
          style={{ zIndex: layers.ADMIN_SHEET }}
        >

          {pins.length} {pins.length === 1 ? 'pin' : 'pins'}
        </button>
      ))}

      <AnimatePresence>
        {open && (
          <motion.aside
            className={`fixed right-2 w-72 max-w-[calc(100vw-1rem)] bg-white/40 backdrop-blur-md rounded-lg shadow-md flex flex-col overflow-hidden ${
              isPhone ? 'top-16' : 'top-2'
            }`}
            style={{ zIndex: layers.ADMIN_SHEET, bottom: 'calc(0.5rem + var(--sab))' }}
            initial={isPhone ? { x: '100%' } : { opacity: 0 }}
            animate={isPhone ? { x: 0 } : { opacity: 1 }}
            exit={isPhone ? { x: '100%' } : { opacity: 0 }}
            transition={isPhone
              ? { type: 'spring', stiffness: 320, damping: 34 }
              : { duration: 0.15 }}
          >
            <div className="flex items-center px-4 py-3 shrink-0">
              <p className="text-xs text-zinc-700 uppercase tracking-wide font-medium flex-1">
                {pins.length} {pins.length === 1 ? 'pin' : 'pins'}
              </p>
              <button
                className="text-zinc-600 hover:text-zinc-900 text-xl leading-none w-6 h-6 flex items-center justify-center"
                onClick={() => setOpen(false)}
                aria-label="Hide pin list"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-3 flex flex-col gap-0.5 min-h-0">
              {sortedPins.map((pin) => (
                <button
                  key={pin.id}
                  onClick={() => handlePinClick(pin)}
                  className="flex items-center gap-2.5 text-left py-2 px-3 rounded-lg hover:bg-white/60 transition-colors group"
                >
                  <span className="text-base leading-none">📍</span>
                  <span className="text-sm text-zinc-800 group-hover:text-zinc-900 truncate flex-1">
                    {pin.label}
                  </span>
                  {pin.image_count !== undefined && pin.image_count > 0 && (
                    <span className="text-xs text-zinc-600 shrink-0">{pin.image_count}</span>
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
