'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import type { Image as ImageType, Pin } from '@/types';
import { computeCascadeLayout, cascadeTotalHeight } from '@/lib/burst-layout';
import PhotoLightbox from '@/components/gallery/PhotoLightbox';

interface PhotoCascadeMobileProps {
  pin: Pin;
  images: ImageType[];
  onClose: () => void;
}

export default function PhotoCascadeMobile({ pin, images, onClose }: PhotoCascadeMobileProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const viewport = useMemo(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }), []);

  const layout = useMemo(
    () => computeCascadeLayout(images, viewport, pin.id),
    [images, viewport, pin.id],
  );

  const totalHeight = useMemo(
    () => cascadeTotalHeight(images.length, viewport),
    [images.length, viewport],
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
        className="fixed inset-0 bg-black/60 z-[100]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="fixed inset-0 z-[101] overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Sticky label */}
        <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-sm">
          <h2 className="text-white font-semibold text-base">{pin.label}</h2>
          <button
            className="text-white/70 hover:text-white text-2xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Cascading photos */}
        <div className="relative" style={{ height: totalHeight }}>
          {layout.map((item, i) => (
            <motion.div
              key={item.image.id}
              className="absolute overflow-hidden rounded-xl cursor-pointer"
              style={{
                zIndex: item.zIndex,
                width: item.photoWidth,
                height: item.photoHeight,
                boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
              }}
              initial={{ x: -viewport.width, y: item.y, opacity: 0, rotate: 0 }}
              animate={{ x: item.x, y: item.y, opacity: 1, rotate: item.rotation }}
              exit={{ x: -viewport.width, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 24, delay: i * 0.05 }}
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
            >
              <Image
                src={item.image.thumb_url}
                alt={item.image.caption ?? ''}
                fill
                className="object-cover pointer-events-none"
                sizes={`${Math.round(item.photoWidth)}px`}
              />
            </motion.div>
          ))}
        </div>
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
