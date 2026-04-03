'use client';

import { AnimatePresence } from 'framer-motion';
import type { Image, Pin, ScreenPos } from '@/types';
import { useViewport } from '@/hooks/useViewport';
import PhotoBurstDesktop from './PhotoBurstDesktop';
import PhotoCascadeMobile from './PhotoCascadeMobile';

interface PhotoBurstSwitchProps {
  pin: Pin;
  images: Image[];
  imagesLoading: boolean;
  pinScreenPos: ScreenPos;
  onClose: () => void;
}

export default function PhotoBurstSwitch({ pin, images, imagesLoading, pinScreenPos, onClose }: PhotoBurstSwitchProps) {
  const { width } = useViewport();

  return (
    <AnimatePresence>
      {width < 768 ? (
        <PhotoCascadeMobile
          key="cascade"
          pin={pin}
          images={images}
          imagesLoading={imagesLoading}
          onClose={onClose}
        />
      ) : (
        <PhotoBurstDesktop
          key="burst"
          pin={pin}
          images={images}
          imagesLoading={imagesLoading}
          pinScreenPos={pinScreenPos}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}
