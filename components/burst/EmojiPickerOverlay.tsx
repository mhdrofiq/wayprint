'use client';

import { useEffect, useRef, useState } from 'react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { layers } from '@/lib/layers';

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
        style={{ zIndex: layers.PICKER_BACKDROP }}
        onClick={onClose}
      />

      {step === 'picking' ? (
        <div
          className="fixed"
          style={{ top: pickerPos.top, left: pickerPos.left, zIndex: layers.PICKER }}
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
          className="fixed bg-tui-panel text-tui-fg border border-tui-fg p-3 flex flex-col gap-3 text-xs"
          style={{ top: namingPos.top, left: namingPos.left, zIndex: layers.PICKER, width: NAMING_W }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '36px', lineHeight: 1 }}>{pendingEmoji}</span>
            <span className="text-tui-dim">Who&apos;s reacting?</span>
          </div>
          <input
            ref={nameInputRef}
            type="text"
            placeholder="Your name (optional)"
            maxLength={20}
            className="w-full bg-tui-bg border border-tui-line-strong px-2 py-1.5 text-sm outline-none focus:border-tui-accent placeholder:text-tui-dim"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirm();
            }}
          />
          <div className="flex justify-between items-center">
            <button
              className="text-tui-dim hover:text-tui-fg transition-colors cursor-pointer"
              onClick={() => setStep('picking')}
            >
              ← Back
            </button>
            <button
              className="bg-tui-accent text-tui-accent-fg font-bold px-3 py-1.5 hover:opacity-90 transition-opacity cursor-pointer"
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
