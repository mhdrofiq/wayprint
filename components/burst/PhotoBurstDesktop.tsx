'use client';

import { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Image, Pin, Collection, ScreenPos } from '@/types';
import { computeScatterLayout, computeGridLayout, PAGE_SIZE } from '@/lib/burst-layout';
import { layers } from '@/lib/layers';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useViewport } from '@/hooks/useViewport';
import BurstPhoto from './BurstPhoto';
import BurstEmptyState from './BurstEmptyState';
import PaginationControls from './PaginationControls';
import PhotoLightbox from '@/components/gallery/PhotoLightbox';

// Sentinel value for the "everything else" (uncollected) view
const UNCOLLECTED = 'uncollected' as const;

interface PhotoBurstDesktopProps {
  pin: Pin;
  images: Image[];
  collections: Collection[];
  imagesLoading: boolean;
  pinScreenPos: ScreenPos;
  onClose: () => void;
  onOpenInSheet?: () => void;
}

export default function PhotoBurstDesktop({ pin, images, collections, imagesLoading, pinScreenPos, onClose, onOpenInSheet }: PhotoBurstDesktopProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isGrid, setIsGrid] = useState(false);
  const [page, setPage] = useState(0);
  const [activeCollectionId, setActiveCollectionId] = useState<string | typeof UNCOLLECTED>(UNCOLLECTED);
  // Track whether the user has explicitly chosen a collection so the auto-
  // default below doesn't override their selection when props re-render.
  const hasExplicitSelection = useRef(false);

  // Set the smart default once images and collections have actually loaded.
  // Can't do this in useState because the component may mount before the
  // data arrives (non-cached path), making collections.length === 0 initially.
  useEffect(() => {
    if (hasExplicitSelection.current) return;
    if (imagesLoading || collections.length === 0) return;
    const hasUncollected = images.some((img) => img.collection_id === null);
    setActiveCollectionId(hasUncollected ? UNCOLLECTED : collections[0].id);
  }, [imagesLoading, images, collections]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isWrapped, setIsWrapped] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const viewport = useViewport();

  useEscapeKey(onClose, lightboxIndex === null);

  const hasCollections = collections.length > 0;

  // Filter images by active collection selection
  const filteredImages = useMemo(() => {
    if (!hasCollections) return images;
    if (activeCollectionId === UNCOLLECTED) return images.filter((img) => img.collection_id === null);
    return images.filter((img) => img.collection_id === activeCollectionId);
  }, [images, collections, activeCollectionId, hasCollections]);

  // Reset page when active collection changes
  const handleCollectionChange = (id: string | typeof UNCOLLECTED) => {
    hasExplicitSelection.current = true;
    setActiveCollectionId(id);
    setPage(0);
    setDropdownOpen(false);
  };

  const totalPages = Math.ceil(filteredImages.length / PAGE_SIZE);
  const pageImages = useMemo(
    () => filteredImages.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredImages, page],
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

  // Detect if the bottom bar overflows the viewport width — if so, collections
  // pill should wrap to a row above.
  useLayoutEffect(() => {
    if (!barRef.current || !hasCollections) return;
    setIsWrapped(barRef.current.scrollWidth > viewport.width - 32);
  }, [viewport.width, hasCollections, collections, activeCollectionId, totalPages, onOpenInSheet]);

  const activeLabel =
    activeCollectionId === UNCOLLECTED
      ? 'Everything else'
      : (collections.find((c) => c.id === activeCollectionId)?.name ?? 'Everything else');

  const collectionsPill = (
    <div className="relative">
      <button
        className="bg-zinc-800 text-white rounded-full px-3.5 py-2 text-sm font-medium shadow-md hover:bg-zinc-700 active:bg-zinc-900 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
        onClick={() => setDropdownOpen((o) => !o)}
        title="Filter by collection"
      >
        {/* Folder icon */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
          <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.086a1.5 1.5 0 0 1 1.06.44l.415.414A1.5 1.5 0 0 0 7.12 3.5H11.5A1.5 1.5 0 0 1 13 5v5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 1 10V3.5Z" />
        </svg>
        {activeLabel}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            className="absolute bottom-full mb-2 left-0 bg-white rounded-2xl shadow-lg py-1.5 min-w-40 overflow-hidden"
            style={{ zIndex: layers.LABEL + 1 }}
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <button
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${activeCollectionId === UNCOLLECTED ? 'text-zinc-900 font-medium bg-zinc-100' : 'text-zinc-600 hover:bg-zinc-50'}`}
              onClick={() => handleCollectionChange(UNCOLLECTED)}
            >
              Everything else
            </button>
            {collections.map((c) => (
              <button
                key={c.id}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${activeCollectionId === c.id ? 'text-zinc-900 font-medium bg-zinc-100' : 'text-zinc-600 hover:bg-zinc-50'}`}
                onClick={() => handleCollectionChange(c.id)}
              >
                {c.name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      {/* Collections pill row — only shown when wrapped */}
      {hasCollections && isWrapped && (
        <motion.div
          className="fixed left-1/2 -translate-x-1/2 flex items-center"
          style={{ zIndex: layers.LABEL, bottom: 'calc(1.5rem + var(--sab) + 52px)' }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          {collectionsPill}
        </motion.div>
      )}

      {/* Main bottom bar */}
      <motion.div
        ref={barRef}
        className="fixed left-1/2 -translate-x-1/2 flex items-center gap-2"
        style={{ zIndex: layers.LABEL, bottom: 'calc(1.5rem + var(--sab))' }}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        {/* Collections pill — inline when not wrapped */}
        {hasCollections && !isWrapped && collectionsPill}

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
        onClick={() => { setDropdownOpen(false); onClose(); }}
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
          ) : !imagesLoading && filteredImages.length === 0 ? (
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
