'use client';

import { AnimatePresence } from 'framer-motion';
import type { Image, Pin, Collection, ScreenPos } from '@/types';
import { useViewport } from '@/hooks/useViewport';
import PhotoBurstDesktop from './PhotoBurstDesktop';
import PhotoCascadeMobile from './PhotoCascadeMobile';

interface PhotoBurstSwitchProps {
  pin: Pin;
  images: Image[];
  collections: Collection[];
  imagesLoading: boolean;
  pinScreenPos: ScreenPos;
  onClose: () => void;
  onOpenInSheet?: () => void;
  onImagesChange: (updater: Image[] | ((prev: Image[]) => Image[])) => void;
}

export default function PhotoBurstSwitch({ pin, images, collections, imagesLoading, pinScreenPos, onClose, onOpenInSheet, onImagesChange }: PhotoBurstSwitchProps) {
  const { width } = useViewport();

  return (
    <AnimatePresence>
      {width < 768 ? (
        <PhotoCascadeMobile
          key="cascade"
          pin={pin}
          images={images}
          collections={collections}
          imagesLoading={imagesLoading}
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
          onClose={onClose}
          onOpenInSheet={onOpenInSheet}
          onImagesChange={onImagesChange}
        />
      )}
    </AnimatePresence>
  );
}
