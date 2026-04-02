'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { Image, Pin, ScreenPos } from '@/types';
import PhotoBurstDesktop from './PhotoBurstDesktop';
import PhotoCascadeMobile from './PhotoCascadeMobile';

interface PhotoBurstSwitchProps {
  pin: Pin;
  images: Image[];
  pinScreenPos: ScreenPos;
  onClose: () => void;
}

export default function PhotoBurstSwitch({ pin, images, pinScreenPos, onClose }: PhotoBurstSwitchProps) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <AnimatePresence>
      {isMobile ? (
        <PhotoCascadeMobile
          key="cascade"
          pin={pin}
          images={images}
          onClose={onClose}
        />
      ) : (
        <PhotoBurstDesktop
          key="burst"
          pin={pin}
          images={images}
          pinScreenPos={pinScreenPos}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}
