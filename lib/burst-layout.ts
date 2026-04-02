import type { Image, ScreenPos } from '@/types';

export interface ScatterItem {
  image: Image;
  x: number;
  y: number;
  rotation: number;
  thumbSize: number;
  zIndex: number;
}

export interface CascadeItem {
  image: Image;
  x: number;
  y: number;
  rotation: number;
  photoWidth: number;
  photoHeight: number;
  zIndex: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomRange(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

// Seeded pseudo-random number generator (mulberry32) so positions are
// stable for a given pin — they won't re-randomise on re-render.
function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (Math.imul(31, hash) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function computeScatterLayout(
  images: Image[],
  pinPos: ScreenPos,
  viewport: { width: number; height: number },
  pinId: string,
): ScatterItem[] {
  const rng = makeRng(seedFromId(pinId));
  const { width: vw, height: vh } = viewport;
  const N = images.length;

  const padding = 60;
  const bounds = { left: padding, right: vw - padding, top: padding, bottom: vh - padding };
  const thumbSize = clamp(Math.sqrt((vw * vh) / (N * 3.5)), 100, 220);
  const half = thumbSize / 2;
  // Constrain photos to a band between 45%–80% of the available radius so they
  // land at a consistent distance from the pin rather than scattered 80px–maxDist.
  const outerDist = Math.min(vw, vh) * 0.4;
  const minDist = outerDist * 0.45;
  const maxDist = outerDist * 0.80;

  return images.map((image, i) => {
    const sectorAngle = (360 / N) * i;
    const angleDeg = sectorAngle + randomRange(-10, 10, rng);
    const angleRad = (angleDeg * Math.PI) / 180;
    const distance = randomRange(minDist, maxDist, rng);

    const rawX = pinPos.x + distance * Math.cos(angleRad) - half;
    const rawY = pinPos.y + distance * Math.sin(angleRad) - half;

    let x = clamp(rawX, bounds.left, bounds.right - thumbSize);
    let y = clamp(rawY, bounds.top, bounds.bottom - thumbSize);

    // After clamping, the photo may have been pushed back toward the pin.
    // Exclusion is center-to-center, so account for the photo's diagonal
    // (half × √2) so that even the nearest corner clears the pin and label.
    const exclusionRadius = Math.ceil(half * Math.SQRT2) + 80;
    const cx = x + half;
    const cy = y + half;
    const dx = cx - pinPos.x;
    const dy = cy - pinPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < exclusionRadius) {
      const pushAngle = dist === 0 ? angleRad : Math.atan2(dy, dx);
      x = clamp(pinPos.x + exclusionRadius * Math.cos(pushAngle) - half, bounds.left, bounds.right - thumbSize);
      y = clamp(pinPos.y + exclusionRadius * Math.sin(pushAngle) - half, bounds.top, bounds.bottom - thumbSize);
    }

    const rotation = randomRange(-10, 10, rng);
    const zIndex = Math.floor(randomRange(1, N + 1, rng));

    return { image, x, y, rotation, thumbSize, zIndex };
  });
}

export function computeCascadeLayout(
  images: Image[],
  viewport: { width: number; height: number },
  pinId: string,
): CascadeItem[] {
  const rng = makeRng(seedFromId(pinId));
  const { width: vw } = viewport;

  const photoWidth = vw * 0.75;
  const photoHeight = photoWidth * 0.75;
  const baseX = vw * 0.05;
  const overlapFactor = 0.8;
  const stepY = photoHeight * (1 - overlapFactor);
  const topPadding = 72; // space for the sticky label

  return images.map((image, i) => {
    const x = baseX + randomRange(-8, 8, rng);
    const y = topPadding + stepY * i;
    const rotation = randomRange(-3, 3, rng);

    return { image, x, y, rotation, photoWidth, photoHeight, zIndex: i };
  });
}

export function cascadeTotalHeight(
  count: number,
  viewport: { width: number; height: number },
): number {
  const photoWidth = viewport.width * 0.75;
  const photoHeight = photoWidth * 0.75;
  const stepY = photoHeight * (1 - 0.8);
  const topPadding = 72;
  return topPadding + stepY * (count - 1) + photoHeight + 40;
}
