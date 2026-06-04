'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { Image, Pin, Collection, ScreenPos } from '@/types';
import PhotoBurstDesktop from './PhotoBurstDesktop';
import PhotoCascadeMobile from './PhotoCascadeMobile';

// Layout-viewport-based check. window.innerWidth shrinks with pinch-zoom on
// iPad Safari; matchMedia tracks the layout viewport, which doesn't.
function useIsMobileLayout() {
  const [isMobile, setIsMobile] = useState(() => !window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsMobile(!mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

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
  const isMobile = useIsMobileLayout();

  return (
    <AnimatePresence>
      {isMobile ? (
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
