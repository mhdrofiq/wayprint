'use client';

import { useEffect, useRef } from 'react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

interface EmojiPickerOverlayProps {
  /** Bounding rect of the card that triggered the picker. */
  cardRect: DOMRect;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

// Picker dimensions (approximate, with previewPosition/skinTonePosition hidden)
const PICKER_W = 352;
const PICKER_H = 380;
const GAP = 8;

function calcPosition(rect: DOMRect): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Prefer above the card; fall back to below if not enough room
  const spaceAbove = rect.top;
  const spaceBelow = vh - rect.bottom;
  let top: number;
  if (spaceAbove >= PICKER_H + GAP) {
    top = rect.top - PICKER_H - GAP;
  } else if (spaceBelow >= PICKER_H + GAP) {
    top = rect.bottom + GAP;
  } else {
    // Centre vertically in viewport as last resort
    top = Math.max(GAP, (vh - PICKER_H) / 2);
  }

  // Horizontally centre on the card, clamped to viewport
  let left = rect.left + rect.width / 2 - PICKER_W / 2;
  left = Math.max(GAP, Math.min(left, vw - PICKER_W - GAP));

  return { top, left };
}

export default function EmojiPickerOverlay({ cardRect, onSelect, onClose }: EmojiPickerOverlayProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const { top, left } = calcPosition(cardRect);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      {/* Transparent backdrop — click to dismiss */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 1100 }}
        onClick={onClose}
      />

      {/* Picker */}
      <div
        ref={pickerRef}
        className="fixed"
        style={{ top, left, zIndex: 1101 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Picker
          data={data}
          onEmojiSelect={(emoji: { native: string }) => {
            onSelect(emoji.native);
          }}
          previewPosition="none"
          skinTonePosition="none"
          perLine={9}
          theme="light"
          autoFocus
        />
      </div>
    </>
  );
}
