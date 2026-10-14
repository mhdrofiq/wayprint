'use client';

import { AnimatePresence } from 'framer-motion';
import type { Image, Pin, Collection, ScreenPos, Updater } from '@/types';
import type { CollectionId } from '@/lib/collections';
import { useIsPhone } from '@/hooks/useIsPhone';
import PhotoBurstDesktop from './PhotoBurstDesktop';
import PhotoCascadeMobile from './PhotoCascadeMobile';

interface PhotoBurstSwitchProps {
  pin: Pin;
  images: Image[];
  collections: Collection[];
  imagesLoading: boolean;
  pinScreenPos: ScreenPos;
  /** Deep-link: pre-select this collection filter on first mount. */
  initialCollectionId?: CollectionId;
  onClose: () => void;
  onOpenInSheet?: () => void;
  onImagesChange: Updater<Image[]>;
}

export default function PhotoBurstSwitch({ pin, images, collections, imagesLoading, pinScreenPos, initialCollectionId, onClose, onOpenInSheet, onImagesChange }: PhotoBurstSwitchProps) {
  // Phones (portrait OR landscape) get the cascade view. useIsPhone is a
  // layout-viewport matchMedia check, so iPad pinch-zoom doesn't flip it.
  const isPhone = useIsPhone();

  return (
    <AnimatePresence>
      {isPhone ? (
        <PhotoCascadeMobile
          key="cascade"
          pin={pin}
          images={images}
          collections={collections}
          imagesLoading={imagesLoading}
          initialCollectionId={initialCollectionId}
          onClose={onClose}
          onImagesChange={onImagesChange}
        />
      ) : (
        <PhotoBurstDesktop
          key="burst"
          pin={pin}
          images={images}
          collections={collections}
          imagesLoading={imagesLoading}
          pinScreenPos={pinScreenPos}
          initialCollectionId={initialCollectionId}
          onClose={onClose}
          onOpenInSheet={onOpenInSheet}
          onImagesChange={onImagesChange}
        />
      )}
    </AnimatePresence>
  );
}
