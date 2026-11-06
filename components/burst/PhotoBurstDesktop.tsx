'use client';

import { useState, useMemo, useRef, useLayoutEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Link as LinkIcon } from 'lucide-react';
import type { Image, Pin, Collection, ScreenPos, Updater } from '@/types';
import { computeScatterLayout, computeGridLayout } from '@/lib/burst-layout';
import { layers } from '@/lib/layers';
import { pinPath, type CollectionId } from '@/lib/collections';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useViewport } from '@/hooks/useViewport';
import { useReactions } from '@/hooks/useReactions';
import { useCollectionFilter } from '@/hooks/useCollectionFilter';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { usePagination } from '@/hooks/usePagination';
import BurstPhoto from './BurstPhoto';
import BurstEmptyState from './BurstEmptyState';
import PaginationControls from './PaginationControls';
import CollectionDropdown, { ChevronDownIcon, FolderIcon, bottomBarMotion } from './CollectionDropdown';
import PhotoLightbox from '@/components/gallery/PhotoLightbox';

const EmojiPickerOverlay = dynamic(() => import('./EmojiPickerOverlay'), { ssr: false });

interface PhotoBurstDesktopProps {
  pin: Pin;
  images: Image[];
  collections: Collection[];
  imagesLoading: boolean;
  pinScreenPos: ScreenPos;
  initialCollectionId?: CollectionId;
  onClose: () => void;
  onOpenInSheet?: () => void;
  onImagesChange: Updater<Image[]>;
}

export default function PhotoBurstDesktop({ pin, images, collections, imagesLoading, pinScreenPos, initialCollectionId, onClose, onOpenInSheet, onImagesChange }: PhotoBurstDesktopProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isGrid, setIsGrid] = useState(false);
  const [pickerState, setPickerState] = useState<{ imageId: string; rect: DOMRect } | null>(null);
  const { ownedReactionIds, handleReact: reactToImage, handleRemoveReaction } = useReactions(onImagesChange);
  const { filteredImages, activeCollectionId, activeLabel, handleCollectionChange, hasCollections } =
    useCollectionFilter(images, collections, imagesLoading, initialCollectionId);
  const { page, setPage, totalPages, pageItems: pageImages } = usePagination(filteredImages);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isWrapped, setIsWrapped] = useState(false);
  const { copied, copy } = useCopyToClipboard();
  const barRef = useRef<HTMLDivElement>(null);
  const viewport = useViewport();

  function copyPinUrl() {
    copy(window.location.origin + pinPath(pin.id, activeCollectionId));
  }

  // The lightbox and emoji picker handle Escape themselves.
  useEscapeKey(onClose, lightboxIndex === null && pickerState === null);

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

  // One bordered strip; each control is a cell in it.
  const bar = 'flex items-stretch h-8 bg-tui-panel text-tui-fg border border-tui-fg text-xs divide-x divide-tui-line-strong';
  const cell = 'flex items-center gap-1.5 px-3 whitespace-nowrap hover:bg-tui-fg hover:text-tui-bg transition-colors cursor-pointer';

  const collectionsPill = (
    <div className="relative flex items-stretch">
      <button
        className={`${cell} gap-2 ${dropdownOpen ? 'bg-tui-fg text-tui-bg' : ''}`}
        onClick={() => setDropdownOpen((o) => !o)}
        title="Filter by collection"
      >
        <FolderIcon />
        {activeLabel}
        <ChevronDownIcon />
      </button>

      <CollectionDropdown
        open={dropdownOpen}
        collections={collections}
        activeId={activeCollectionId}
        onSelect={(id) => handleCollectionChange(id, () => { setPage(0); setDropdownOpen(false); })}
        className="-left-px min-w-48"
        itemPadding="py-1.5"
      />
    </div>
  );

  return (
    <>
      {/* Collections pill row — only shown when wrapped */}
      {hasCollections && isWrapped && (
        <motion.div
          className={`fixed left-1/2 -translate-x-1/2 ${bar}`}
          style={{ zIndex: layers.LABEL, bottom: 'calc(1.5rem + var(--sab) + 40px)' }}
          {...bottomBarMotion}
        >
          {collectionsPill}
        </motion.div>
      )}

      {/* Main bottom bar */}
      <motion.div
        ref={barRef}
        className={`fixed left-1/2 -translate-x-1/2 ${bar}`}
        style={{ zIndex: layers.LABEL, bottom: 'calc(1.5rem + var(--sab))' }}
        {...bottomBarMotion}
      >
        {/* Collections pill — inline when not wrapped */}
        {hasCollections && !isWrapped && collectionsPill}

        <button
          className={`${cell} group`}
          onClick={copyPinUrl}
          title={copied ? 'Pin URL copied' : 'Copy pin URL'}
        >
          {copied
            ? <Check size={13} className="text-tui-accent-text group-hover:text-tui-bg" />
            : <LinkIcon size={13} className="text-tui-dim group-hover:text-tui-bg" />}
          {pin.label}
        </button>
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
            className={cell}
            onClick={onOpenInSheet}
            title="Open photo list"
          >
            {/* List icon */}
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
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
          className={cell}
          onClick={() => setIsGrid((g) => !g)}
          title={isGrid ? 'Show scattered' : 'Show as grid'}
        >
          {isGrid ? (
            // Scatter icon — three small rectangles at different angles
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <rect x="0" y="1" width="8" height="6" rx="0.75" transform="rotate(-10 4 4)" opacity="0.55" />
              <rect x="4" y="2" width="8" height="6" rx="0.75" transform="rotate(7 8 5)" opacity="0.8" />
              <rect x="3" y="8" width="9" height="6" rx="0.75" />
            </svg>
          ) : (
            // Grid icon — four squares in a 2×2 layout
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <rect x="1" y="1" width="6" height="6" rx="0.75" />
              <rect x="9" y="1" width="6" height="6" rx="0.75" />
              <rect x="1" y="9" width="6" height="6" rx="0.75" />
              <rect x="9" y="9" width="6" height="6" rx="0.75" />
            </svg>
          )}
          {isGrid ? 'scatter' : 'grid'}
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
              className="absolute -translate-x-1/2 -translate-y-1/2 bg-tui-panel border border-tui-line-strong px-3 py-1.5 text-xs text-tui-dim pointer-events-none"
              style={{ left: pinScreenPos.x, top: pinScreenPos.y }}
            >
              loading…
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
                onOpenPicker={(rect) => setPickerState({ imageId: item.image.id, rect })}
                ownedReactionIds={ownedReactionIds}
                onRemoveReaction={(reactionId) => handleRemoveReaction(item.image.id, reactionId)}
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

      {pickerState && (
        <EmojiPickerOverlay
          cardRect={pickerState.rect}
          onSelect={(emoji, name) => { setPickerState(null); reactToImage(pickerState.imageId, emoji, name); }}
          onClose={() => setPickerState(null)}
        />
      )}
    </>
  );
}
