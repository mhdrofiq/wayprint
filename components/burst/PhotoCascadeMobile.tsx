'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Check, Link as LinkIcon } from 'lucide-react';
import type { Image as ImageType, Pin, Collection } from '@/types';
import {
  computeCascadeLayout,
  cascadeTotalHeight,
  computeHorizontalCascadeLayout,
  cascadeHorizontalTotalWidth,
  PAGE_SIZE,
} from '@/lib/burst-layout';
import { layers } from '@/lib/layers';
import { copyText } from '@/lib/copy-to-clipboard';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useViewport } from '@/hooks/useViewport';
import { useReactions } from '@/hooks/useReactions';
import { useCollectionFilter, UNCOLLECTED, type CollectionId } from '@/hooks/useCollectionFilter';
import PhotoLightbox from '@/components/gallery/PhotoLightbox';
import BurstEmptyState from './BurstEmptyState';
import PaginationControls from './PaginationControls';

const EmojiPickerOverlay = dynamic(() => import('./EmojiPickerOverlay'), { ssr: false });



/**
 * Computes the display position (in px, relative to the card's top-left corner)
 * for a reaction sticker at index `i` in the mobile cascade top-left cluster.
 *
 * Reactions are laid out in rows of 5 along the top-left of the thumbnail:
 *   - 20px horizontal stride (26px emoji → ~6px overlap between neighbours)
 *   - Rows are 22px apart (slight vertical overlap between rows)
 *   - First row overhangs the card top by 8px (top edge bleed allowed by design)
 *   - No reaction ever overflows the left edge (starts at 4px from left)
 *   - Max extent: 4 + 4×20 = 84px (≈29% of a 290px card) — clear of centre touch target
 */
function cascadeReactionPos(i: number): { left: number; top: number } {
  // 28px stride (26px emoji + 2px gap) ensures no overlap between stickers
  return {
    left: 4 + (i % 5) * 28,
    top: -8 + Math.floor(i / 5) * 28,
  };
}

// Height of a single floating bar row (button height + padding)
const BAR_ROW_HEIGHT = 44;
// Gap between the two floating bar rows
const BAR_ROW_GAP = 10;
// Top reservation for the horizontal cascade. Smaller than the actual ~48px
// header so photos extend up behind it; the translucent backdrop-blur header
// keeps the title legible while letting the photos peek through.
const HORIZONTAL_TOP_RESERVATION = 12;

interface PhotoCascadeMobileProps {
  pin: Pin;
  images: ImageType[];
  collections: Collection[];
  imagesLoading: boolean;
  initialCollectionId?: CollectionId;
  onClose: () => void;
  onImagesChange: (updater: ImageType[] | ((prev: ImageType[]) => ImageType[])) => void;
}

export default function PhotoCascadeMobile({ pin, images, collections, imagesLoading, initialCollectionId, onClose, onImagesChange }: PhotoCascadeMobileProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pickerState, setPickerState] = useState<{ imageId: string; rect: DOMRect } | null>(null);
  const [removalConfirm, setRemovalConfirm] = useState<{ imageId: string; reactionId: string; emoji: string } | null>(null);
  const { ownedReactionIds, handleReact: reactToImage, handleRemoveReaction } = useReactions(onImagesChange);
  const { filteredImages, activeCollectionId, activeLabel, handleCollectionChange, hasCollections } =
    useCollectionFilter(images, collections, imagesLoading, initialCollectionId);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewport = useViewport();

  async function copyPinUrl() {
    // Uncollected is the pin's default view — no ?c= needed.
    const query = activeCollectionId === UNCOLLECTED ? '' : `?c=${activeCollectionId}`;
    await copyText(`${window.location.origin}/pin/${pin.id}${query}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const isLandscape = viewport.width > viewport.height;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [page, isLandscape]);

  useEscapeKey(onClose, lightboxIndex === null);

  const totalPages = Math.ceil(filteredImages.length / PAGE_SIZE);
  const pageImages = useMemo(
    () => filteredImages.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredImages, page],
  );

  // How tall is the floating bottom bar area?
  // One row (pagination only) or two rows (collections + pagination).
  const bottomBarHeight =
    BAR_ROW_HEIGHT +
    (hasCollections ? BAR_ROW_GAP + BAR_ROW_HEIGHT : 0);

  // Reserved viewport space the horizontal cascade must avoid (header + bars).
  const reserved = useMemo(
    () => ({ top: HORIZONTAL_TOP_RESERVATION, bottom: bottomBarHeight + 24 }),
    [bottomBarHeight],
  );

  const layout = useMemo(
    () => isLandscape
      ? computeHorizontalCascadeLayout(pageImages, viewport, pin.id, reserved)
      : computeCascadeLayout(pageImages, viewport, pin.id),
    [pageImages, viewport, pin.id, isLandscape, reserved],
  );

  const totalHeight = useMemo(
    () => cascadeTotalHeight(pageImages.length, viewport),
    [pageImages.length, viewport],
  );

  const totalWidth = useMemo(
    () => cascadeHorizontalTotalWidth(pageImages.length, viewport, reserved),
    [pageImages.length, viewport, reserved],
  );

  // Base bottom position for the lower bar row (pagination)
  const paginationBottom = 'calc(1.5rem + var(--sab))';
  // Collections row sits above pagination
  const collectionsBottom = `calc(1.5rem + var(--sab) + ${BAR_ROW_HEIGHT + BAR_ROW_GAP}px)`;

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
        className={`fixed inset-0 overscroll-none ${
          isLandscape ? 'overflow-x-auto overflow-y-hidden' : 'overflow-y-auto'
        }`}
        style={{ zIndex: layers.BURST }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => { setDropdownOpen(false); onClose(); }}
      >
        {/* Sticky header — clicking anywhere on it closes the cascade.
            In landscape it also sticks to left:0 so it stays anchored during
            horizontal scroll, and spans the visible viewport. */}
        <div
          className={`sticky z-50 flex items-center gap-2 px-4 py-3 bg-black/50 backdrop-blur-sm ${
            isLandscape ? 'top-0 left-0 w-screen' : 'top-0'
          }`}
        >
          <h2 className="text-white font-semibold text-base truncate flex-1 min-w-0">{pin.label}</h2>
          <button
            aria-label={copied ? 'Pin URL copied' : 'Copy pin URL'}
            className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white backdrop-blur-md active:bg-white/25 transition-colors shrink-0"
            onClick={(e) => { e.stopPropagation(); copyPinUrl(); }}
          >
            {copied ? <Check size={12} /> : <LinkIcon size={12} />}
            <span className="font-sans">{copied ? 'Copied' : 'Copy URL'}</span>
          </button>
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

        {/* Cascading photos — key={page} remounts photos to re-trigger entry animation.
            In landscape, the inner box is sized horizontally and pins to viewport height. */}
        <div
          key={page}
          className="relative"
          style={isLandscape
            ? { width: totalWidth, height: viewport.height }
            : { height: totalHeight }}
        >
          {layout.map((item, i) => {
            const reactions = item.image.reactions ?? [];
            const atCap = reactions.length >= 15;
            return (
              <motion.div
                key={item.image.id}
                ref={(el) => { cardRefs.current[i] = el; }}
                className="absolute rounded-lg cursor-pointer"
                style={{
                  zIndex: item.zIndex,
                  width: item.photoWidth,
                  height: item.photoHeight,
                  backgroundColor: '#f8f5f0',
                  padding: '5px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.20)',
                }}
                initial={isLandscape
                  ? { x: item.x, y: item.y - 80, opacity: 0, rotate: 0, scale: 1 }
                  : { x: -viewport.width, y: item.y, opacity: 0, rotate: 0, scale: 1 }
                }
                animate={{
                  x: item.x,
                  y: item.y,
                  opacity: 1,
                  rotate: item.rotation,
                  scale: 1,
                }}
                exit={isLandscape ? { opacity: 0 } : { x: -viewport.width, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 24, delay: i * 0.05 }}
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
              >
                {/* Photo */}
                <div className="relative w-full h-full overflow-hidden rounded-lg">
                  <Image
                    src={item.image.thumb_url}
                    alt={item.image.caption ?? ''}
                    fill
                    unoptimized
                    loading="eager"
                    className="object-cover pointer-events-none"
                    sizes={`${Math.round(item.photoWidth)}px`}
                  />
                </div>

                {/* Reaction stickers — top-left cluster, slight top-edge overhang allowed */}
                {reactions.map((r, ri) => {
                  const { left, top } = cascadeReactionPos(ri);
                  const isOwned = ownedReactionIds.has(r.id);
                  return (
                    <div
                      key={r.id}
                      className="absolute select-none"
                      style={{
                        left,
                        top,
                        zIndex: 10,
                        transform: `rotate(${r.rotation}deg)`,
                        pointerEvents: isOwned ? 'auto' : 'none',
                        cursor: isOwned ? 'pointer' : undefined,
                      }}
                      onClick={isOwned ? (e) => {
                        e.stopPropagation();
                        setRemovalConfirm({ imageId: item.image.id, reactionId: r.id, emoji: r.emoji });
                      } : undefined}
                    >
                      <span
                        style={{
                          fontSize: '26px',
                          lineHeight: 1,
                          display: 'block',
                          filter: 'drop-shadow(0 1px 0px rgba(0,0,0,0.8))',
                        }}
                      >
                        {r.emoji}
                      </span>
                    </div>
                  );
                })}

                {/* Add-reaction button — top-right, always visible on mobile */}
                {!atCap && (
                  <button
                    className="absolute top-1.5 right-1.5 bg-zinc-700/80 text-white rounded-full w-7 h-7 flex items-center justify-center shadow pointer-events-auto"
                    style={{ zIndex: 20 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = cardRefs.current[i]?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect();
                      setPickerState({ imageId: item.image.id, rect });
                    }}
                    title="Add reaction"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                      <rect x="5" y="0" width="2" height="12" rx="1" />
                      <rect x="0" y="5" width="12" height="2" rx="1" />
                    </svg>
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Spacer so the last photos clear the floating bar (vertical only —
            horizontal cascade already reserves bottom-bar space in its layout) */}
        {!isLandscape && <div style={{ height: bottomBarHeight + 24 }} />}
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
              className="bg-black/40 backdrop-blur-sm text-white rounded-2xl px-3.5 py-2 text-sm font-medium shadow-md hover:bg-black/55 active:bg-black/70 transition-colors cursor-pointer flex items-center gap-1.5 max-w-[calc(100vw-2rem)] text-left"
              onClick={(e) => { e.stopPropagation(); setDropdownOpen((o) => !o); }}
              title="Filter by collection"
            >
              {/* Folder icon */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden className="shrink-0">
                <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.086a1.5 1.5 0 0 1 1.06.44l.415.414A1.5 1.5 0 0 0 7.12 3.5H11.5A1.5 1.5 0 0 1 13 5v5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 1 10V3.5Z" />
              </svg>
              <span className="min-w-0 break-words">{activeLabel}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden className="shrink-0">
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
                    onClick={(e) => { e.stopPropagation(); handleCollectionChange(UNCOLLECTED, () => { setPage(0); setDropdownOpen(false); }); }}
                  >
                    Everything else
                  </button>
                  {collections.map((c) => (
                    <button
                      key={c.id}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${activeCollectionId === c.id ? 'text-zinc-900 font-medium bg-zinc-100' : 'text-zinc-600 hover:bg-zinc-50'}`}
                      onClick={(e) => { e.stopPropagation(); handleCollectionChange(c.id, () => { setPage(0); setDropdownOpen(false); }); }}
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

      {pickerState && (
        <EmojiPickerOverlay
          cardRect={pickerState.rect}
          onSelect={(emoji, name) => { setPickerState(null); reactToImage(pickerState.imageId, emoji, name); }}
          onClose={() => setPickerState(null)}
        />
      )}

      {/* Removal confirmation modal */}
      <AnimatePresence>
        {removalConfirm && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50"
              style={{ zIndex: layers.CONFIRMATION_BACKDROP }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRemovalConfirm(null)}
            />
            <motion.div
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl px-6 py-5 flex flex-col items-center gap-4 w-64"
              style={{ zIndex: layers.CONFIRMATION }}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <span style={{ fontSize: '44px', lineHeight: 1 }}>{removalConfirm.emoji}</span>
              <p className="text-sm text-zinc-600 text-center">Remove this reaction?</p>
              <div className="flex gap-2 w-full">
                <button
                  className="flex-1 py-2 rounded-lg text-sm text-zinc-500 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 transition-colors"
                  onClick={() => setRemovalConfirm(null)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 py-2 rounded-lg text-sm text-white bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 transition-colors"
                  onClick={() => {
                    handleRemoveReaction(removalConfirm.imageId, removalConfirm.reactionId);
                    setRemovalConfirm(null);
                  }}
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
