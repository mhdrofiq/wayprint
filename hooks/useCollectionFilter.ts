'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import type { Image, Collection } from '@/types';

const UNCOLLECTED = 'uncollected' as const;
type CollectionId = string | typeof UNCOLLECTED;

export { UNCOLLECTED };
export type { CollectionId };

export function useCollectionFilter(
  images: Image[],
  collections: Collection[],
  imagesLoading: boolean,
) {
  const [activeCollectionId, setActiveCollectionId] = useState<CollectionId>(UNCOLLECTED);
  const hasExplicitSelection = useRef(false);

  // Set the smart default once images and collections have actually loaded.
  // Can't do this in useState because the component may mount before the
  // data arrives (non-cached path), making collections.length === 0 initially.
  useEffect(() => {
    if (hasExplicitSelection.current) return;
    if (imagesLoading || collections.length === 0) return;
    const hasUncollected = images.some((img) => img.collection_id === null);
    setActiveCollectionId(hasUncollected ? UNCOLLECTED : collections[0].id);
  }, [imagesLoading, images, collections]);

  const hasCollections = collections.length > 0;

  const filteredImages = useMemo(() => {
    if (!hasCollections) return images;
    if (activeCollectionId === UNCOLLECTED) return images.filter((img) => img.collection_id === null);
    return images.filter((img) => img.collection_id === activeCollectionId);
  }, [images, collections, activeCollectionId, hasCollections]);

  const activeLabel =
    activeCollectionId === UNCOLLECTED
      ? 'Everything else'
      : (collections.find((c) => c.id === activeCollectionId)?.name ?? 'Everything else');

  function handleCollectionChange(id: CollectionId, onAfter?: () => void) {
    hasExplicitSelection.current = true;
    setActiveCollectionId(id);
    onAfter?.();
  }

  return { filteredImages, activeCollectionId, activeLabel, handleCollectionChange, hasCollections };
}
