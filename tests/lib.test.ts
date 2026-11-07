import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import type { Collection, Image, Pin } from '@/types';
import {
  PAGE_SIZE,
  cascadeHorizontalTotalWidth,
  cascadeTotalHeight,
  computeCascadeLayout,
  computeGridLayout,
  computeHorizontalCascadeLayout,
  computeScatterLayout,
} from '@/lib/burst-layout';
import { UNCOLLECTED, defaultCollectionId, filterByCollection, pinPath } from '@/lib/collections';
import { computeReactionPosition } from '@/lib/reaction-placement';
import { REACTION_CAP, withoutReaction } from '@/lib/reactions';
import { hashReactorKey, parseReactorKey } from '@/lib/reactor-key';
import { isUuid } from '@/lib/ids';
import { MAX_NAME_LENGTH, trimName } from '@/lib/api';
import { countLabel } from '@/lib/utils';
import { sortNewestFirst } from '@/lib/pins';
import { firstPageThumbs } from '@/lib/preload';
import { processImage } from '@/lib/image-processing';

function image(id: string, collection_id: string | null = null, extra: Partial<Image> = {}): Image {
  return {
    id, pin_id: 'p', url: `full/${id}`, thumb_url: `thumb/${id}`, caption: null,
    sort_order: 0, created_at: '2026-01-01T00:00:00Z', collection_id, ...extra,
  };
}
const images = (n: number) => Array.from({ length: n }, (_, i) => image(`img${i}`));
const collection = (id: string): Collection => ({ id, pin_id: 'p', name: id, sort_order: 0, created_at: '' });

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('burst layout', () => {
  const viewport = { width: 1000, height: 800 };

  it('centres a 2x2 grid of full-size thumbs', () => {
    const layout = computeGridLayout(images(4), viewport);
    expect(layout.map(({ x, y, thumbSize, rotation, zIndex }) => ({ x, y, thumbSize, rotation, zIndex }))).toEqual([
      { x: 276, y: 151, thumbSize: 220, rotation: 0, zIndex: 1 },
      { x: 504, y: 151, thumbSize: 220, rotation: 0, zIndex: 2 },
      { x: 276, y: 379, thumbSize: 220, rotation: 0, zIndex: 3 },
      { x: 504, y: 379, thumbSize: 220, rotation: 0, zIndex: 4 },
    ]);
  });

  it('centres a partial last grid row', () => {
    expect(computeGridLayout(images(3), viewport)[2]).toMatchObject({ x: 390, y: 379 });
  });

  it('shrinks grid thumbs to fit many photos', () => {
    const layout = computeGridLayout(images(PAGE_SIZE), viewport);
    expect(layout[0].thumbSize).toBeLessThan(220);
    for (const item of layout) {
      expect(item.x).toBeGreaterThanOrEqual(60);
      expect(item.x + item.thumbSize).toBeLessThanOrEqual(940);
      expect(item.y).toBeGreaterThanOrEqual(60);
      expect(item.y + item.thumbSize).toBeLessThanOrEqual(690);
    }
  });

  it('returns no grid items for no images', () => {
    expect(computeGridLayout([], viewport)).toEqual([]);
  });

  it('scatters the same pin to the same positions every time', () => {
    const a = computeScatterLayout(images(6), viewport, 'pin-a');
    expect(computeScatterLayout(images(6), viewport, 'pin-a')).toEqual(a);
    expect(computeScatterLayout(images(6), viewport, 'pin-b')).not.toEqual(a);
    expect(a).toMatchSnapshot();
  });

  it('keeps scattered photos inside the padded viewport with a small tilt', () => {
    for (const item of computeScatterLayout(images(PAGE_SIZE), viewport, 'pin-a')) {
      expect(item.thumbSize).toBe(220);
      expect(item.x).toBeGreaterThanOrEqual(60);
      expect(item.x).toBeLessThanOrEqual(1000 - 60 - 220);
      expect(item.y).toBeGreaterThanOrEqual(60);
      expect(item.y).toBeLessThanOrEqual(800 - 110 - 220);
      expect(Math.abs(item.rotation)).toBeLessThanOrEqual(12);
      expect(item.zIndex).toBeGreaterThanOrEqual(1);
      expect(item.zIndex).toBeLessThanOrEqual(PAGE_SIZE);
    }
  });

  it('stacks the vertical cascade down the page', () => {
    const layout = computeCascadeLayout(images(3), { width: 400, height: 800 }, 'pin-a');
    expect(layout.map((i) => [i.y, i.photoWidth, i.photoHeight, i.zIndex])).toEqual([
      [72, 360, 270, 0],
      [72 + 229.5, 360, 270, 1],
      [72 + 459, 360, 270, 2],
    ]);
    for (const item of layout) {
      expect(Math.abs(item.x - 20)).toBeLessThanOrEqual(8);
      expect(Math.abs(item.rotation)).toBeLessThanOrEqual(3);
    }
    expect(layout).toEqual(computeCascadeLayout(images(3), { width: 400, height: 800 }, 'pin-a'));
    expect(layout).toMatchSnapshot();
    expect(cascadeTotalHeight(3, { width: 400, height: 800 })).toBe(841);
  });

  it('lays the horizontal cascade out left to right between the reserved bands', () => {
    const vp = { width: 800, height: 400 };
    const reserved = { top: 12, bottom: 68 };
    const layout = computeHorizontalCascadeLayout(images(2), vp, 'pin-a', reserved);
    expect(layout.map((i) => [i.photoWidth, i.photoHeight])).toEqual([[416, 312], [416, 312]]);
    expect(layout[0].x).toBe(60);
    expect(layout[1].x).toBeCloseTo(413.6);
    for (const item of layout) expect(Math.abs(item.y - 16)).toBeLessThanOrEqual(6);
    expect(layout).toMatchSnapshot();
    expect(cascadeHorizontalTotalWidth(2, vp, reserved)).toBeCloseTo(869.6);
    expect(cascadeHorizontalTotalWidth(0, vp, reserved)).toBe(60);
    expect(computeHorizontalCascadeLayout(images(1), { width: 300, height: 100 }, 'p', reserved)[0].photoHeight).toBe(160);
  });
});

describe('collections', () => {
  it('links to a pin with the collection in the query unless uncollected', () => {
    expect(pinPath('p1', UNCOLLECTED)).toBe('/pin/p1');
    expect(pinPath('p1', 'c1')).toBe('/pin/p1?c=c1');
  });

  it('opens on uncollected photos when there are any, else the first collection', () => {
    expect(defaultCollectionId([image('a')], [])).toBe(UNCOLLECTED);
    expect(defaultCollectionId([image('a', 'c1'), image('b')], [collection('c1')])).toBe(UNCOLLECTED);
    expect(defaultCollectionId([image('a', 'c2')], [collection('c1'), collection('c2')])).toBe('c1');
  });

  it('filters by collection only when the pin has collections', () => {
    const all = [image('a', 'c1'), image('b'), image('c', 'c2')];
    expect(filterByCollection(all, false, 'c1')).toBe(all);
    expect(filterByCollection(all, true, 'c1').map((i) => i.id)).toEqual(['a']);
    expect(filterByCollection(all, true, UNCOLLECTED).map((i) => i.id)).toEqual(['b']);
  });

  it('preloads the first page of the default filter', () => {
    const all = [...images(PAGE_SIZE + 2), image('in-c1', 'c1')];
    expect(firstPageThumbs(all, [])).toHaveLength(PAGE_SIZE);
    expect(firstPageThumbs(all, [collection('c1')])).toEqual(all.slice(0, PAGE_SIZE).map((i) => i.thumb_url));
    expect(firstPageThumbs(all, [collection('c1')], 'c1')).toEqual(['thumb/in-c1']);
  });
});

describe('reaction placement', () => {
  it('places stickers near the image edge with a 8-15 degree tilt', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRandom(1));
    for (let n = 0; n < 50; n++) {
      const { pos_x, pos_y, rotation } = computeReactionPosition([]);
      expect(pos_x).toBeGreaterThanOrEqual(6 / 220 - 0.12 - 1e-9);
      expect(pos_x).toBeLessThanOrEqual(214 / 220 + 0.12 + 1e-9);
      expect(pos_y).toBeGreaterThanOrEqual(6 / 220 - 0.12 - 1e-9);
      expect(pos_y).toBeLessThanOrEqual(200 / 220 + 0.12 + 1e-9);
      const nearEdge =
        Math.abs(pos_x - 6 / 220) <= 0.12 || Math.abs(pos_x - 214 / 220) <= 0.12 ||
        Math.abs(pos_y - 6 / 220) <= 0.12 || Math.abs(pos_y - 200 / 220) <= 0.12;
      expect(nearEdge).toBe(true);
      expect(Math.abs(rotation)).toBeGreaterThanOrEqual(8);
      expect(Math.abs(rotation)).toBeLessThanOrEqual(15);
    }
  });

  it('is reproducible for the same random sequence', () => {
    const existing = [{ pos_x: 0.1, pos_y: 0.1 }, { pos_x: 0.9, pos_y: 0.5 }];
    vi.spyOn(Math, 'random').mockImplementation(seededRandom(7));
    const first = [computeReactionPosition([]), computeReactionPosition(existing)];
    vi.spyOn(Math, 'random').mockImplementation(seededRandom(7));
    expect([computeReactionPosition([]), computeReactionPosition(existing)]).toEqual(first);
    expect(first).toMatchSnapshot();
  });

  it('moves away from a crowded corner', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRandom(3));
    const crowd = [{ pos_x: 0, pos_y: 0 }, { pos_x: 0.05, pos_y: 0.02 }, { pos_x: 0.02, pos_y: 0.08 }];
    const { pos_x, pos_y } = computeReactionPosition(crowd);
    expect(Math.hypot(pos_x, pos_y)).toBeGreaterThan(0.5);
  });
});

describe('small helpers', () => {
  it('removes one reaction from one image', () => {
    const r = (id: string) => ({ id, image_id: 'a', emoji: '🙂', pos_x: 0, pos_y: 0, rotation: 0, reactor_name: 'x', created_at: '' });
    const before = [image('a', null, { reactions: [r('r1'), r('r2')] }), image('b', null, { reactions: [r('r1')] })];
    const after = withoutReaction(before, 'a', 'r1');
    expect(after[0].reactions!.map((x) => x.id)).toEqual(['r2']);
    expect(after[1]).toBe(before[1]);
    expect(withoutReaction([image('c')], 'c', 'r1')[0].reactions).toEqual([]);
    expect(REACTION_CAP).toBe(15);
  });

  it('accepts reactor keys of 16-100 chars and hashes them with sha256', () => {
    expect(parseReactorKey('a'.repeat(15))).toBeNull();
    expect(parseReactorKey('a'.repeat(16))).toBe('a'.repeat(16));
    expect(parseReactorKey('a'.repeat(100))).toBe('a'.repeat(100));
    expect(parseReactorKey('a'.repeat(101))).toBeNull();
    expect(parseReactorKey(12345678901234567)).toBeNull();
    expect(hashReactorKey('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('recognises uuids', () => {
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isUuid('123E4567-E89B-12D3-A456-426614174000')).toBe(true);
    expect(isUuid('123e4567-e89b-12d3-a456-42661417400')).toBe(false);
    expect(isUuid('not-a-uuid')).toBe(false);
  });

  it('trims and caps names, passing non-strings through', () => {
    expect(trimName('  hi  ')).toBe('hi');
    expect(trimName('x'.repeat(MAX_NAME_LENGTH + 5))).toHaveLength(100);
    expect(trimName(5)).toBe(5);
    expect(trimName(undefined)).toBeUndefined();
  });

  it('pluralises counts', () => {
    expect(countLabel(1, 'pin')).toBe('1 pin');
    expect(countLabel(0, 'pin')).toBe('0 pins');
    expect(countLabel(3, 'photo')).toBe('3 photos');
  });

  it('sorts pins newest first without mutating the input', () => {
    const pin = (id: string, created_at: string): Pin => ({ id, label: id, lat: 0, lng: 0, created_at, updated_at: created_at });
    const pins = [pin('old', '2024-01-01'), pin('new', '2026-01-01'), pin('mid', '2025-01-01')];
    expect(sortNewestFirst(pins).map((p) => p.id)).toEqual(['new', 'mid', 'old']);
    expect(pins[0].id).toBe('old');
  });
});

describe('image processing', () => {
  it('makes a full and a thumb webp, capped on the long edge, without metadata', async () => {
    const input = await sharp({ create: { width: 3000, height: 1500, channels: 3, background: '#c33' } })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Copyright: 'secret' } } })
      .toBuffer();
    const { full, thumb } = await processImage(input);
    const [fm, tm] = await Promise.all([sharp(full).metadata(), sharp(thumb).metadata()]);
    expect([fm.format, fm.width, fm.height, fm.exif]).toEqual(['webp', 2000, 1000, undefined]);
    expect([tm.format, tm.width, tm.height, tm.exif]).toEqual(['webp', 800, 400, undefined]);
  });

  it('never enlarges a small image', async () => {
    const input = await sharp({ create: { width: 300, height: 200, channels: 3, background: '#3c3' } }).png().toBuffer();
    const { full, thumb } = await processImage(input);
    expect((await sharp(full).metadata()).width).toBe(300);
    expect((await sharp(thumb).metadata()).width).toBe(300);
  });
});
