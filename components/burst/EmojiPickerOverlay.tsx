'use client';

import { useEffect, useRef, useState } from 'react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

interface EmojiPickerOverlayProps {
  /** Bounding rect of the card that triggered the picker. */
  cardRect: DOMRect;
  onSelect: (emoji: string, name: string) => void;
  onClose: () => void;
}

// Picker dimensions (approximate, with previewPosition/skinTonePosition hidden)
const PICKER_W = 352;
const PICKER_H = 380;
const NAMING_W = 300;
const NAMING_H = 148;
const GAP = 8;

function calcPosition(rect: DOMRect, h: number, w: number): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const spaceAbove = rect.top;
  const spaceBelow = vh - rect.bottom;
  let top: number;
  if (spaceAbove >= h + GAP) {
    top = rect.top - h - GAP;
  } else if (spaceBelow >= h + GAP) {
    top = rect.bottom + GAP;
  } else {
    top = Math.max(GAP, (vh - h) / 2);
  }

  let left = rect.left + rect.width / 2 - w / 2;
  left = Math.max(GAP, Math.min(left, vw - w - GAP));

  return { top, left };
}

export default function EmojiPickerOverlay({ cardRect, onSelect, onClose }: EmojiPickerOverlayProps) {
  const [step, setStep] = useState<'picking' | 'naming'>('picking');
  const [pendingEmoji, setPendingEmoji] = useState('');
  const [name, setName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const pickerPos = calcPosition(cardRect, PICKER_H, PICKER_W);
  const namingPos = calcPosition(cardRect, NAMING_H, NAMING_W);

  useEffect(() => {
    if (step === 'naming') {
      nameInputRef.current?.focus();
    }
  }, [step]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (step === 'naming') setStep('picking');
        else onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, onClose]);

  function handleEmojiSelect(emoji: string) {
    setPendingEmoji(emoji);
    setStep('naming');
  }

  function handleConfirm() {
    onSelect(pendingEmoji, name.trim() || 'anon');
  }

  return (
    <>
      {/* Transparent backdrop — click to dismiss */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 1100 }}
        onClick={onClose}
      />

      {step === 'picking' ? (
        <div
          className="fixed"
          style={{ top: pickerPos.top, left: pickerPos.left, zIndex: 1101 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Picker
            data={data}
            onEmojiSelect={(emoji: { native: string }) => handleEmojiSelect(emoji.native)}
            previewPosition="none"
            skinTonePosition="none"
            perLine={9}
            theme="light"
            autoFocus
          />
        </div>
      ) : (
        <div
          className="fixed bg-white rounded-2xl shadow-2xl p-4 flex flex-col gap-3"
          style={{ top: namingPos.top, left: namingPos.left, zIndex: 1101, width: NAMING_W }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '36px', lineHeight: 1 }}>{pendingEmoji}</span>
            <span className="text-sm text-zinc-500">Who&apos;s reacting?</span>
          </div>
          <input
            ref={nameInputRef}
            type="text"
            placeholder="Your name (optional)"
            maxLength={20}
            className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-zinc-300"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirm();
            }}
          />
          <div className="flex justify-between items-center">
            <button
              className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
              onClick={() => setStep('picking')}
            >
              ← Back
            </button>
            <button
              className="text-sm bg-zinc-800 text-white rounded-lg px-4 py-1.5 hover:bg-zinc-700 active:bg-zinc-900 transition-colors"
              onClick={handleConfirm}
            >
              Add reaction
            </button>
          </div>
        </div>
      )}
    </>
  );
}
