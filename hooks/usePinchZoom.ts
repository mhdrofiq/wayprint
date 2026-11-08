import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
const SWIPE_PX = 80;
const SWIPE_RESISTANCE = 0.2;

type Point = { x: number; y: number };
type Transform = { scale: number; x: number; y: number };

interface Options {
  /** Swipe left (next photo). Only fires while the photo isn't zoomed. */
  onSwipeLeft?: () => void;
  /** Swipe right (previous photo). Only fires while the photo isn't zoomed. */
  onSwipeRight?: () => void;
}

/**
 * Pinch-to-zoom, pan, double-tap zoom and horizontal swipe for one element,
 * handled in JS so the browser never sees the gesture (the element needs
 * `touch-action: none`). Without that, a pinch zooms the whole page and a
 * downward drag pulls the page to refresh.
 *
 * The transform is written straight to `targetRef`'s style. Remount the
 * component (e.g. key it by photo) to reset the zoom.
 */
export function usePinchZoom<T extends HTMLElement>({ onSwipeLeft, onSwipeRight }: Options) {
  const targetRef = useRef<T>(null);
  const pointers = useRef(new Map<number, Point>());
  const t = useRef<Transform>({ scale: 1, x: 0, y: 0 });
  // Snapshot at the start of the current gesture
  const start = useRef<{ t: Transform; mid: Point; dist: number; swipeX: number | null }>({
    t: { scale: 1, x: 0, y: 0 },
    mid: { x: 0, y: 0 },
    dist: 0,
    swipeX: null,
  });
  const lastTap = useRef<{ time: number; point: Point } | null>(null);
  const moved = useRef(false);

  const apply = useCallback((next: Transform, animate = false) => {
    t.current = next;
    const el = targetRef.current;
    if (!el) return;
    el.style.transition = animate ? 'transform 200ms ease-out' : 'none';
    el.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) scale(${next.scale})`;
  }, []);

  /** Keeps the zoomed photo covering its box, so it can't be panned off screen. */
  const clamp = useCallback((next: Transform): Transform => {
    const el = targetRef.current;
    if (!el || next.scale <= 1) return { scale: Math.max(1, next.scale), x: 0, y: 0 };
    const maxX = ((next.scale - 1) * el.offsetWidth) / 2;
    const maxY = ((next.scale - 1) * el.offsetHeight) / 2;
    return {
      scale: next.scale,
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }, []);

  /** Pointer position relative to the centre of the element's untransformed box. */
  const local = useCallback((e: { clientX: number; clientY: number }): Point => {
    const el = targetRef.current!;
    const box = el.parentElement!.getBoundingClientRect();
    return { x: e.clientX - box.left - box.width / 2, y: e.clientY - box.top - box.height / 2 };
  }, []);

  const begin = useCallback(() => {
    const pts = [...pointers.current.values()];
    const mid =
      pts.length >= 2 ? { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 } : pts[0];
    const dist = pts.length >= 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    start.current = {
      t: { ...t.current },
      mid,
      dist,
      swipeX: pts.length === 1 && t.current.scale === 1 ? pts[0].x : null,
    };
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<T>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, local(e));
      if (pointers.current.size === 1) moved.current = false;
      begin();
    },
    [begin, local],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<T>) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, local(e));
      const pts = [...pointers.current.values()];
      const s = start.current;

      if (pts.length >= 2 && s.dist > 0) {
        moved.current = true;
        const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const scale = Math.min(MAX_SCALE, Math.max(0.8, (s.t.scale * dist) / s.dist));
        const k = scale / s.t.scale;
        // Keep the point under the fingers' midpoint fixed while scaling
        apply({ scale, x: mid.x - (s.mid.x - s.t.x) * k, y: mid.y - (s.mid.y - s.t.y) * k });
        return;
      }

      const p = pts[0];
      if (Math.hypot(p.x - s.mid.x, p.y - s.mid.y) > 6) moved.current = true;
      if (s.swipeX !== null) {
        apply({ scale: 1, x: (p.x - s.swipeX) * SWIPE_RESISTANCE, y: 0 });
      } else if (t.current.scale > 1) {
        apply(clamp({ scale: t.current.scale, x: s.t.x + p.x - s.mid.x, y: s.t.y + p.y - s.mid.y }));
      }
    },
    [apply, clamp, local],
  );

  const onPointerEnd = useCallback(
    (e: ReactPointerEvent<T>) => {
      if (!pointers.current.has(e.pointerId)) return;
      const end = local(e);
      const s = start.current;
      pointers.current.delete(e.pointerId);

      if (pointers.current.size > 0) {
        // One finger lifted mid-pinch: carry on panning with the other.
        begin();
        start.current.swipeX = null;
        return;
      }

      if (s.swipeX !== null && t.current.scale === 1) {
        const dx = end.x - s.swipeX;
        apply({ scale: 1, x: 0, y: 0 }, true);
        if (dx < -SWIPE_PX) onSwipeLeft?.();
        else if (dx > SWIPE_PX) onSwipeRight?.();
      } else {
        apply(clamp(t.current), true);
      }

      // Double tap toggles zoom around the tapped point
      if (!moved.current && e.type === 'pointerup') {
        const now = performance.now();
        const prev = lastTap.current;
        if (prev && now - prev.time < DOUBLE_TAP_MS && Math.hypot(end.x - prev.point.x, end.y - prev.point.y) < 30) {
          lastTap.current = null;
          if (t.current.scale > 1) apply({ scale: 1, x: 0, y: 0 }, true);
          else {
            const k = DOUBLE_TAP_SCALE;
            apply(clamp({ scale: k, x: -end.x * (k - 1), y: -end.y * (k - 1) }), true);
          }
        } else {
          lastTap.current = { time: now, point: end };
        }
      }
    },
    [apply, begin, clamp, local, onSwipeLeft, onSwipeRight],
  );

  // Safari fires its own gesture events for a pinch; cancel them so the page
  // never zooms underneath.
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const cancel = (ev: Event) => ev.preventDefault();
    el.addEventListener('gesturestart', cancel);
    el.addEventListener('gesturechange', cancel);
    return () => {
      el.removeEventListener('gesturestart', cancel);
      el.removeEventListener('gesturechange', cancel);
    };
  }, []);

  return {
    targetRef,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  };
}
