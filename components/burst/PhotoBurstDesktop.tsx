'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Image, Pin, ScreenPos } from '@/types';
import { computeScatterLayout } from '@/lib/burst-layout';
import BurstPhoto from './BurstPhoto';
import PhotoLightbox from '@/components/gallery/PhotoLightbox';

interface PhotoBurstDesktopProps {
  pin: Pin;
  images: Image[];
  pinScreenPos: ScreenPos;
  onClose: () => void;
}

export default function PhotoBurstDesktop({ pin, images, pinScreenPos, onClose }: PhotoBurstDesktopProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const viewport = useMemo(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }), []);

  const layout = useMemo(
    () => computeScatterLayout(images, pinScreenPos, viewport, pin.id),
    [images, pinScreenPos, viewport, pin.id],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && lightboxIndex === null) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, lightboxIndex]);

  return (
    <>
      <motion.div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-102 bg-white rounded-full px-4 py-2 text-sm font-medium shadow-md whitespace-nowrap pointer-events-none"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        {pin.label}
      </motion.div>

      <motion.div
        className="fixed inset-0 bg-black/40 z-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

<motion.div
        className="fixed inset-0 pointer-events-none z-101"
        initial="closed"
        animate="open"
        exit="closed"
        variants={{
          open: { transition: { staggerChildren: 0.04 } },
          closed: { transition: { staggerChildren: 0.025, staggerDirection: -1 } },
        }}
      >
        {layout.map((item, i) => (
          <BurstPhoto
            key={item.image.id}
            image={item.image}
            targetX={item.x}
            targetY={item.y}
            rotation={item.rotation}
            size={item.thumbSize}
            zIndex={item.zIndex}
            originX={pinScreenPos.x}
            originY={pinScreenPos.y}
            onOpen={() => setLightboxIndex(i)}
          />
        ))}
      </motion.div>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <PhotoLightbox
            images={images}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
          />
        )}
      </AnimatePresence>
    </>
  );
}
