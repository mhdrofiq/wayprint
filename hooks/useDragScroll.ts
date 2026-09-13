'use client';

import { useRef, useState, type PointerEvent, type MouseEvent } from 'react';

// Pixels of movement before a press is treated as a drag rather than a click.
const DRAG_THRESHOLD = 4;

/**
 * Lets a horizontally-scrolling container be scrolled by click-dragging with
 * the mouse (touch already pans natively, so it's left alone). Spread the
 * returned handlers onto the container; clicks on children still work unless
 * the press turned into a drag.
 */
export function useDragScroll<T extends HTMLElement>() {
  const [isDragging, setIsDragging] = useState(false);
  const start = useRef<{ x: number; scrollLeft: number } | null>(null);
  const dragged = useRef(false);

  function onPointerDown(e: PointerEvent<T>) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    // Don't hijack text selection inside inputs (e.g. the new-collection field).
    if ((e.target as HTMLElement).closest('input, textarea')) return;
    start.current = { x: e.clientX, scrollLeft: e.currentTarget.scrollLeft };
    dragged.current = false;
  }

  function onPointerMove(e: PointerEvent<T>) {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    if (!dragged.current) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      // Past the threshold: commit to dragging. Capturing routes the eventual
      // click to the container instead of whichever tab is under the cursor.
      dragged.current = true;
      setIsDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    e.currentTarget.scrollLeft = start.current.scrollLeft - dx;
  }

  function onPointerUp(e: PointerEvent<T>) {
    if (!start.current) return;
    start.current = null;
    if (dragged.current) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDragging(false);
    }
  }

  // Belt-and-braces: swallow the click that ends a drag so no tab activates.
  function onClickCapture(e: MouseEvent<T>) {
    if (dragged.current) {
      e.preventDefault();
      e.stopPropagation();
      dragged.current = false;
    }
  }

  return {
    isDragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onClickCapture,
    },
  };
}
