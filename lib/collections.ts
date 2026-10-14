// Collection filter ids shared by the burst views, the deep-link page and
// share URLs. "Uncollected" is a pseudo-collection: images with no collection_id.

export const UNCOLLECTED = 'uncollected' as const;
export type CollectionId = string | typeof UNCOLLECTED;

/** Path of a pin's share link. Uncollected is the pin's default view, so it gets no `?c=`. */
export function pinPath(pinId: string, collectionId: CollectionId): string {
  const query = collectionId === UNCOLLECTED ? '' : `?c=${collectionId}`;
  return `/pin/${pinId}${query}`;
}
