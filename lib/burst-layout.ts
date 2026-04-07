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
  _pinPos: ScreenPos,
  viewport: { width: number; height: number },
  pinId: string,
): ScatterItem[] {
  const rng = makeRng(seedFromId(pinId));
  const { width: vw, height: vh } = viewport;
  const N = images.length;

  // Fixed thumbnail size — never shrinks regardless of photo count.
  const thumbSize = 220;
  const half = thumbSize / 2;

  // Asymmetric padding: extra bottom space for the pin-label pill.
  const padH = 60;
  const padV = { top: 60, bottom: 110 };

  // Farthest-point placement: for each photo, sample K random candidate
  // positions and pick the one that maximises the minimum distance to all
  // already-placed photo centres. This naturally repels photos from each
  // other and spreads them across the viewport without a visible grid.
  const K = 25;
  const placed: Array<{ cx: number; cy: number }> = [];

  return images.map((image) => {
    let bestCx = 0, bestCy = 0, bestMinDist = -Infinity;

    for (let attempt = 0; attempt < K; attempt++) {
      const cx = randomRange(padH + half, vw - padH - half, rng);
      const cy = randomRange(padV.top + half, vh - padV.bottom - half, rng);

      // Minimum distance to any already-placed photo centre.
      let minDist = Infinity;
      for (const p of placed) {
        const d = Math.sqrt((cx - p.cx) ** 2 + (cy - p.cy) ** 2);
        if (d < minDist) minDist = d;
      }
      if (placed.length === 0) minDist = Infinity;

      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestCx = cx;
        bestCy = cy;
      }
    }

    placed.push({ cx: bestCx, cy: bestCy });

    const x = clamp(bestCx - half, padH, vw - padH - thumbSize);
    const y = clamp(bestCy - half, padV.top, vh - padV.bottom - thumbSize);
    const rotation = randomRange(-12, 12, rng);
    const zIndex = Math.floor(randomRange(1, N + 1, rng));

    return { image, x, y, rotation, thumbSize, zIndex };
  });
}

export function computeGridLayout(
  images: Image[],
  viewport: { width: number; height: number },
): ScatterItem[] {
  const { width: vw, height: vh } = viewport;
  const N = images.length;
  if (N === 0) return [];

  const padH = 60;
  const padTop = 60;
  const padBottom = 110; // clears the label pill
  const gap = 8;

  const availW = vw - 2 * padH;
  const availH = vh - padTop - padBottom;

  const cols = Math.max(1, Math.round(Math.sqrt(N * (availW / availH))));
  const rows = Math.ceil(N / cols);

  // Scale thumbSize down only enough to fit the grid; never above 220px.
  const maxByWidth = Math.floor((availW - (cols - 1) * gap) / cols);
  const maxByHeight = Math.floor((availH - (rows - 1) * gap) / rows);
  const thumbSize = Math.min(220, maxByWidth, maxByHeight);

  // Centre the entire grid in the available area.
  const gridW = cols * thumbSize + (cols - 1) * gap;
  const gridH = rows * thumbSize + (rows - 1) * gap;
  const startX = padH + (availW - gridW) / 2;
  const startY = padTop + (availH - gridH) / 2;

  return images.map((image, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);

    // Centre any partial last row.
    const photosInRow = row === rows - 1 ? ((N - 1) % cols) + 1 : cols;
    const rowOffset = ((cols - photosInRow) * (thumbSize + gap)) / 2;

    const x = startX + rowOffset + col * (thumbSize + gap);
    const y = startY + row * (thumbSize + gap);

    // No rotation in grid mode; ascending zIndex so later photos sit on top.
    return { image, x, y, rotation: 0, thumbSize, zIndex: i + 1 };
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
