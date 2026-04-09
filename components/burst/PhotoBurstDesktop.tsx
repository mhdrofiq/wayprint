'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Image, Pin, ScreenPos } from '@/types';
import { computeScatterLayout, computeGridLayout, PAGE_SIZE } from '@/lib/burst-layout';
import { layers } from '@/lib/layers';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useViewport } from '@/hooks/useViewport';
import BurstPhoto from './BurstPhoto';
import BurstEmptyState from './BurstEmptyState';
import PaginationControls from './PaginationControls';
import PhotoLightbox from '@/components/gallery/PhotoLightbox';

interface PhotoBurstDesktopProps {
  pin: Pin;
  images: Image[];
  imagesLoading: boolean;
  pinScreenPos: ScreenPos;
  onClose: () => void;
  onOpenInSheet?: () => void;
}

export default function PhotoBurstDesktop({ pin, images, imagesLoading, pinScreenPos, onClose, onOpenInSheet }: PhotoBurstDesktopProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isGrid, setIsGrid] = useState(false);
  const [page, setPage] = useState(0);
  const viewport = useViewport();

  useEscapeKey(onClose, lightboxIndex === null);

  const totalPages = Math.ceil(images.length / PAGE_SIZE);
  const pageImages = useMemo(
    () => images.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [images, page],
  );

  const scatterLayout = useMemo(
    () => computeScatterLayout(pageImages, viewport, pin.id),
    [pageImages, viewport, pin.id],
  );
  const gridLayout = useMemo(
    () => computeGridLayout(pageImages, viewport),
    [pageImages, viewport],
  );
  const layout = isGrid ? gridLayout : scatterLayout;

  return (
    <>
      <motion.div
        className="fixed left-1/2 -translate-x-1/2 flex items-center gap-2"
        style={{ zIndex: layers.LABEL, bottom: 'calc(1.5rem + var(--sab))' }}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        <div className="bg-white rounded-full px-4 py-2 text-sm font-medium shadow-md whitespace-nowrap pointer-events-none">
          {pin.label}
        </div>
        {totalPages > 1 && (
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        )}
        {onOpenInSheet && (
          <button
            className="bg-zinc-800 text-white rounded-full p-2.5 shadow-md hover:bg-zinc-700 active:bg-zinc-900 transition-colors cursor-pointer"
            onClick={onOpenInSheet}
            title="Open photo list"
          >
            {/* List icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <rect x="1" y="2" width="3" height="3" rx="0.5" />
              <rect x="6" y="3" width="9" height="1.5" rx="0.75" />
              <rect x="1" y="6.75" width="3" height="3" rx="0.5" />
              <rect x="6" y="7.75" width="9" height="1.5" rx="0.75" />
              <rect x="1" y="11.5" width="3" height="3" rx="0.5" />
              <rect x="6" y="12.5" width="9" height="1.5" rx="0.75" />
            </svg>
          </button>
        )}
        <button
          className="bg-zinc-800 text-white rounded-full p-2.5 shadow-md hover:bg-zinc-700 active:bg-zinc-900 transition-colors cursor-pointer"
          onClick={() => setIsGrid((g) => !g)}
          title={isGrid ? 'Show scattered' : 'Show as grid'}
        >
          {isGrid ? (
            // Scatter icon — three small rectangles at different angles
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <rect x="0" y="1" width="8" height="6" rx="0.75" transform="rotate(-10 4 4)" opacity="0.55" />
              <rect x="4" y="2" width="8" height="6" rx="0.75" transform="rotate(7 8 5)" opacity="0.8" />
              <rect x="3" y="8" width="9" height="6" rx="0.75" />
            </svg>
          ) : (
            // Grid icon — four squares in a 2×2 layout
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <rect x="1" y="1" width="6" height="6" rx="0.75" />
              <rect x="9" y="1" width="6" height="6" rx="0.75" />
              <rect x="1" y="9" width="6" height="6" rx="0.75" />
              <rect x="9" y="9" width="6" height="6" rx="0.75" />
            </svg>
          )}
        </button>
      </motion.div>

      <motion.div
        className="fixed inset-0 bg-black/40"
        style={{ zIndex: layers.BACKDROP }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: layers.BURST }}
          initial="closed"
          animate="open"
          exit="closed"
          variants={{
            open: { transition: { staggerChildren: Math.min(0.04, 0.5 / Math.max(pageImages.length, 1)) } },
            closed: { transition: { staggerChildren: Math.min(0.025, 0.3 / Math.max(pageImages.length, 1)), staggerDirection: -1 } },
          }}
        >
          {imagesLoading && images.length === 0 ? (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-zinc-500 pointer-events-none"
              style={{ left: pinScreenPos.x, top: pinScreenPos.y }}
            >
              Loading…
            </div>
          ) : !imagesLoading && images.length === 0 ? (
            <BurstEmptyState className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
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
                equalPadding={isGrid}
                onOpen={() => setLightboxIndex(i)}
              />
            ))
          )}
        </motion.div>
      </AnimatePresence>

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
