'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import type { Image as ImageType, Pin, Collection } from '@/types';
import { computeCascadeLayout, cascadeTotalHeight, PAGE_SIZE } from '@/lib/burst-layout';
import { layers } from '@/lib/layers';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useViewport } from '@/hooks/useViewport';
import PhotoLightbox from '@/components/gallery/PhotoLightbox';
import BurstEmptyState from './BurstEmptyState';
import PaginationControls from './PaginationControls';

// Sentinel value for the "everything else" (uncollected) view
const UNCOLLECTED = 'uncollected' as const;

// Height of a single floating bar row (button height + padding)
const BAR_ROW_HEIGHT = 44;
// Gap between the two floating bar rows
const BAR_ROW_GAP = 10;

interface PhotoCascadeMobileProps {
  pin: Pin;
  images: ImageType[];
  collections: Collection[];
  imagesLoading: boolean;
  onClose: () => void;
}

export default function PhotoCascadeMobile({ pin, images, collections, imagesLoading, onClose }: PhotoCascadeMobileProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [activeCollectionId, setActiveCollectionId] = useState<string | typeof UNCOLLECTED>(UNCOLLECTED);
  const hasExplicitSelection = useRef(false);

  useEffect(() => {
    if (hasExplicitSelection.current) return;
    if (imagesLoading || collections.length === 0) return;
    const hasUncollected = images.some((img) => img.collection_id === null);
    setActiveCollectionId(hasUncollected ? UNCOLLECTED : collections[0].id);
  }, [imagesLoading, images, collections]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewport = useViewport();

  const hasCollections = collections.length > 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [page]);

  useEscapeKey(onClose, lightboxIndex === null);

  // Filter images by active collection
  const filteredImages = useMemo(() => {
    if (!hasCollections) return images;
    if (activeCollectionId === UNCOLLECTED) return images.filter((img) => img.collection_id === null);
    return images.filter((img) => img.collection_id === activeCollectionId);
  }, [images, collections, activeCollectionId, hasCollections]);

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

  const layout = useMemo(
    () => computeCascadeLayout(pageImages, viewport, pin.id),
    [pageImages, viewport, pin.id],
  );

  const totalHeight = useMemo(
    () => cascadeTotalHeight(pageImages.length, viewport),
    [pageImages.length, viewport],
  );

  // How tall is the floating bottom bar area?
  // One row (pagination only) or two rows (collections + pagination).
  const bottomBarHeight =
    BAR_ROW_HEIGHT +
    (hasCollections ? BAR_ROW_GAP + BAR_ROW_HEIGHT : 0);

  // Base bottom position for the lower bar row (pagination)
  const paginationBottom = 'calc(1.5rem + var(--sab))';
  // Collections row sits above pagination
  const collectionsBottom = `calc(1.5rem + var(--sab) + ${BAR_ROW_HEIGHT + BAR_ROW_GAP}px)`;

  const activeLabel =
    activeCollectionId === UNCOLLECTED
      ? 'Everything else'
      : (collections.find((c) => c.id === activeCollectionId)?.name ?? 'Everything else');

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
        onClick={() => { setDropdownOpen(false); onClose(); }}
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
        {!imagesLoading && filteredImages.length === 0 && (
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

        {/* Spacer so the last photos clear the floating bar */}
        <div style={{ height: bottomBarHeight + 24 }} />
      </motion.div>

      {/* Collections dropdown row */}
      {hasCollections && (
        <motion.div
          className="fixed left-1/2 -translate-x-1/2"
          style={{ zIndex: layers.LABEL, bottom: collectionsBottom }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          <div className="relative">
            <button
              className="bg-zinc-800 text-white rounded-full px-3.5 py-2 text-sm font-medium shadow-md hover:bg-zinc-700 active:bg-zinc-900 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              onClick={(e) => { e.stopPropagation(); setDropdownOpen((o) => !o); }}
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
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-lg py-1.5 min-w-44 overflow-hidden"
                  style={{ zIndex: layers.LABEL + 1 }}
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  <button
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${activeCollectionId === UNCOLLECTED ? 'text-zinc-900 font-medium bg-zinc-100' : 'text-zinc-600 hover:bg-zinc-50'}`}
                    onClick={(e) => { e.stopPropagation(); handleCollectionChange(UNCOLLECTED); }}
                  >
                    Everything else
                  </button>
                  {collections.map((c) => (
                    <button
                      key={c.id}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${activeCollectionId === c.id ? 'text-zinc-900 font-medium bg-zinc-100' : 'text-zinc-600 hover:bg-zinc-50'}`}
                      onClick={(e) => { e.stopPropagation(); handleCollectionChange(c.id); }}
                    >
                      {c.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Pagination row */}
      {totalPages > 1 && (
        <motion.div
          className="fixed left-1/2 -translate-x-1/2 flex items-center gap-2"
          style={{ zIndex: layers.LABEL, bottom: paginationBottom }}
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
