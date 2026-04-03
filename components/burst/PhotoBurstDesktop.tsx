'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Image, Pin, ScreenPos } from '@/types';
import { computeScatterLayout } from '@/lib/burst-layout';
import { layers } from '@/lib/layers';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useViewport } from '@/hooks/useViewport';
import BurstPhoto from './BurstPhoto';
import PhotoLightbox from '@/components/gallery/PhotoLightbox';

interface PhotoBurstDesktopProps {
  pin: Pin;
  images: Image[];
  imagesLoading: boolean;
  pinScreenPos: ScreenPos;
  onClose: () => void;
}

export default function PhotoBurstDesktop({ pin, images, imagesLoading, pinScreenPos, onClose }: PhotoBurstDesktopProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const viewport = useViewport();

  useEscapeKey(onClose, lightboxIndex === null);

  const layout = useMemo(
    () => computeScatterLayout(images, pinScreenPos, viewport, pin.id),
    [images, pinScreenPos, viewport, pin.id],
  );

  return (
    <>
      <motion.div
        className="fixed left-1/2 -translate-x-1/2 bg-white rounded-full px-4 py-2 text-sm font-medium shadow-md whitespace-nowrap pointer-events-none"
        style={{ zIndex: layers.LABEL, bottom: 'calc(1.5rem + var(--sab))' }}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        {pin.label}
      </motion.div>

      <motion.div
        className="fixed inset-0 bg-black/40"
        style={{ zIndex: layers.BACKDROP }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: layers.BURST }}
        initial="closed"
        animate="open"
        exit="closed"
        variants={{
          open: { transition: { staggerChildren: 0.04 } },
          closed: { transition: { staggerChildren: 0.025, staggerDirection: -1 } },
        }}
      >
        {imagesLoading && images.length === 0 ? (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-zinc-500 pointer-events-none"
            style={{ left: pinScreenPos.x, top: pinScreenPos.y }}
          >
            Loading…
          </div>
        ) : (
          layout.map((item, i) => (
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
          ))
        )}
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
