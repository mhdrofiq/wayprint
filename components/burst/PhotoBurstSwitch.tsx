'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { Image, Pin, Collection, ScreenPos } from '@/types';
import PhotoBurstDesktop from './PhotoBurstDesktop';
import PhotoCascadeMobile from './PhotoCascadeMobile';

// Phones (portrait OR landscape) get the cascade view.
// Layout-viewport-based check via matchMedia — immune to iPad pinch-zoom,
// which shrinks window.innerWidth/innerHeight.
const PHONE_QUERY = '(max-width: 767px), (max-height: 500px)';
function useIsPhoneLayout() {
  const [isPhone, setIsPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches);
  useEffect(() => {
    const mql = window.matchMedia(PHONE_QUERY);
    const onChange = () => setIsPhone(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isPhone;
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
  const isPhone = useIsPhoneLayout();

  return (
    <AnimatePresence>
      {isPhone ? (
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
