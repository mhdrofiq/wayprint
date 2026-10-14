// Browser-side warming of photos the viewer is about to see.

import type { Collection, Image } from '@/types';
import { PAGE_SIZE } from '@/lib/burst-layout';
import { defaultCollectionId, filterByCollection, type CollectionId } from '@/lib/collections';

/** Thumbnail URLs on the first page of a pin's burst. */
export function firstPageThumbs(
  images: Image[],
  collections: Collection[],
  collectionId: CollectionId = defaultCollectionId(images, collections),
): string[] {
  return filterByCollection(images, collections.length > 0, collectionId)
    .slice(0, PAGE_SIZE)
    .map((img) => img.thumb_url);
}

const warmed = new Set<string>();

/** Starts downloading images into the browser cache so they paint instantly
 *  when shown. R2 serves them as immutable, so each URL is fetched once. */
export function warmImages(urls: string[]) {
  for (const url of urls) {
    if (warmed.has(url)) continue;
    warmed.add(url);
    const img = new window.Image();
    img.decoding = 'async';
    img.src = url;
  }
}
