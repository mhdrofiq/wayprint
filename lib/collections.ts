// Collection filter ids shared by the burst views, the deep-link page and
// share URLs. "Uncollected" is a pseudo-collection: images with no collection_id.

export const UNCOLLECTED = 'uncollected' as const;
export type CollectionId = string | typeof UNCOLLECTED;

/** Path of a pin's share link. Uncollected is the pin's default view, so it gets no `?c=`. */
export function pinPath(pinId: string, collectionId: CollectionId): string {
  const query = collectionId === UNCOLLECTED ? '' : `?c=${collectionId}`;
  return `/pin/${pinId}${query}`;
}

type Filterable = { collection_id: string | null };

/** The filter a burst opens on when none was requested: the uncollected photos
 *  if there are any (or no collections at all), else the first collection. */
export function defaultCollectionId(images: Filterable[], collections: { id: string }[]): CollectionId {
  if (collections.length === 0 || images.some((img) => img.collection_id === null)) return UNCOLLECTED;
  return collections[0].id;
}

/** The images a filter shows. Without collections, every image shows. */
export function filterByCollection<T extends Filterable>(
  images: T[],
  hasCollections: boolean,
  collectionId: CollectionId,
): T[] {
  if (!hasCollections) return images;
  const wanted = collectionId === UNCOLLECTED ? null : collectionId;
  return images.filter((img) => img.collection_id === wanted);
}
