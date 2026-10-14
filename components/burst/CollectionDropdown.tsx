'use client';

import type { MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Collection } from '@/types';
import { layers } from '@/lib/layers';
import { UNCOLLECTED, type CollectionId } from '@/lib/collections';

// Shared pieces of the collection filter used by the desktop burst and the
// phone cascade: the pill's icons and the menu that opens above it.

export const FolderIcon = ({ className }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden className={className}>
    <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.086a1.5 1.5 0 0 1 1.06.44l.415.414A1.5 1.5 0 0 0 7.12 3.5H11.5A1.5 1.5 0 0 1 13 5v5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 1 10V3.5Z" />
  </svg>
);

export const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden className={className}>
    <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/** Slide-up entrance shared by the floating bottom bars. */
export const bottomBarMotion = {
  initial: { y: 40, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 40, opacity: 0 },
  transition: { type: 'spring', stiffness: 300, damping: 28 },
} as const;

interface CollectionDropdownProps {
  open: boolean;
  collections: Collection[];
  activeId: CollectionId;
  onSelect: (id: CollectionId, e: MouseEvent) => void;
  /** Positioning and width of the menu. */
  className: string;
  /** Vertical padding of each option. */
  itemPadding: string;
}

export default function CollectionDropdown({ open, collections, activeId, onSelect, className, itemPadding }: CollectionDropdownProps) {
  const options: Array<{ id: CollectionId; name: string }> = [
    { id: UNCOLLECTED, name: 'Everything else' },
    ...collections.map((c) => ({ id: c.id, name: c.name })),
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`absolute bottom-full mb-2 bg-white rounded-2xl shadow-lg py-1.5 overflow-hidden ${className}`}
          style={{ zIndex: layers.LABEL + 1 }}
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          {options.map((o) => (
            <button
              key={o.id}
              className={`w-full text-left px-4 ${itemPadding} text-sm transition-colors ${activeId === o.id ? 'text-zinc-900 font-medium bg-zinc-100' : 'text-zinc-600 hover:bg-zinc-50'}`}
              onClick={(e) => onSelect(o.id, e)}
            >
              {o.name}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
