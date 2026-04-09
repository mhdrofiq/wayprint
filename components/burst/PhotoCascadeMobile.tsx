'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import type { Image as ImageType, Pin } from '@/types';
import { computeCascadeLayout, cascadeTotalHeight, PAGE_SIZE } from '@/lib/burst-layout';
import { layers } from '@/lib/layers';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useViewport } from '@/hooks/useViewport';
import PhotoLightbox from '@/components/gallery/PhotoLightbox';
import BurstEmptyState from './BurstEmptyState';
import PaginationControls from './PaginationControls';

interface PhotoCascadeMobileProps {
  pin: Pin;
  images: ImageType[];
  imagesLoading: boolean;
  onClose: () => void;
}

export default function PhotoCascadeMobile({ pin, images, imagesLoading, onClose }: PhotoCascadeMobileProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewport = useViewport();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [page]);

  useEscapeKey(onClose, lightboxIndex === null);

  const totalPages = Math.ceil(images.length / PAGE_SIZE);
  const pageImages = useMemo(
    () => images.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [images, page],
  );

  const layout = useMemo(
    () => computeCascadeLayout(pageImages, viewport, pin.id),
    [pageImages, viewport, pin.id],
  );

  const totalHeight = useMemo(
    () => cascadeTotalHeight(pageImages.length, viewport),
    [pageImages.length, viewport],
  );

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/60"
        style={{ zIndex: layers.BACKDROP }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      <motion.div
        ref={scrollRef}
        className="fixed inset-0 overflow-y-auto"
        style={{ zIndex: layers.BURST }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Sticky header — clicking anywhere on it closes the cascade */}
        <div className="sticky top-0 z-50 flex items-center px-4 py-3 bg-black/50 backdrop-blur-sm">
          <h2 className="text-white font-semibold text-base truncate">{pin.label}</h2>
        </div>

        {/* Loading state */}
        {imagesLoading && images.length === 0 && (
          <div className="flex items-center justify-center pt-16">
            <span className="text-white/60 text-sm">Loading…</span>
          </div>
        )}

        {/* Empty state */}
        {!imagesLoading && images.length === 0 && (
          <div className="flex items-center justify-center pt-16">
            <BurstEmptyState />
          </div>
        )}

        {/* Cascading photos — key={page} remounts photos to re-trigger entry animation */}
        <div key={page} className="relative" style={{ height: totalHeight }}>
          {layout.map((item, i) => (
            <motion.div
              key={item.image.id}
              className="absolute rounded-xl cursor-pointer"
              style={{
                zIndex: item.zIndex,
                width: item.photoWidth,
                height: item.photoHeight,
                backgroundColor: '#f8f5f0',
                padding: '5px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.20)',
              }}
              initial={{ x: -viewport.width, y: item.y, opacity: 0, rotate: 0, scale: 1 }}
              animate={{
                x: item.x,
                y: item.y,
                opacity: 1,
                rotate: item.rotation,
                scale: 1,
              }}
              exit={{ x: -viewport.width, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 24, delay: i * 0.05 }}
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
            >
              <div className="relative w-full h-full overflow-hidden rounded-lg">
                <Image
                  src={item.image.thumb_url}
                  alt={item.image.caption ?? ''}
                  fill
                  loading="eager"
                  className="object-cover pointer-events-none"
                  sizes={`${Math.round(item.photoWidth)}px`}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {totalPages > 1 && (
        <motion.div
          className="fixed left-1/2 -translate-x-1/2 flex items-center gap-2"
          style={{ zIndex: layers.LABEL, bottom: 'calc(1.5rem + var(--sab))' }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </motion.div>
      )}

      <AnimatePresence>
        {lightboxIndex !== null && (
          <PhotoLightbox
            images={pageImages}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
          />
        )}
      </AnimatePresence>
    </>
  );
}
