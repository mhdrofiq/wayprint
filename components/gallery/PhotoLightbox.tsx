'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Check, Copy, X } from 'lucide-react';
import type { Image as ImageType } from '@/types';
import { layers } from '@/lib/layers';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { warmImages } from '@/lib/preload';
import LightboxReactions from './LightboxReactions';

interface PhotoLightboxProps {
  images: ImageType[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function PhotoLightbox({ images, index, onClose, onNavigate }: PhotoLightboxProps) {
  const image = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;
  const { copied, setCopied, copy } = useCopyToClipboard();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(index - 1);
      if (e.key === 'ArrowRight' && hasNext) onNavigate(index + 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, hasPrev, hasNext, onClose, onNavigate]);

  useEffect(() => {
    setCopied(false);
  }, [image.id, setCopied]);

  // Once this photo is in, fetch its neighbours' full-size photos so arrowing
  // or swiping to them shows them straight away. Waiting keeps them from
  // competing with the photo on screen for bandwidth.
  function warmNeighbours() {
    warmImages([images[index - 1], images[index + 1]].filter(Boolean).map((img) => img.url));
  }

  function copyUrl() {
    copy(new URL(image.url, window.location.origin).toString());
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const reactions = image.reactions ?? [];
  const hasFooter = !!image.caption || reactions.length > 0;
  const btn = 'flex items-center gap-1.5 border border-tui-line-strong px-2 h-5 hover:bg-tui-fg hover:text-tui-bg transition-colors cursor-pointer';

  // Clicking anywhere outside the photo and the controls closes the lightbox.
  return (
    <motion.div
      className="fixed inset-0 flex flex-col bg-tui-bg/95 text-tui-fg text-xs"
      style={{ zIndex: layers.LIGHTBOX }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Header: position, copy URL, close */}
      <div
        className="flex items-stretch shrink-0 bg-tui-panel border-b border-tui-line whitespace-nowrap"
        style={{ height: 'calc(var(--tui-top-h) + var(--sat))', paddingTop: 'var(--sat)' }}
      >
        <div className="flex items-center px-2.5 bg-tui-accent text-tui-accent-fg font-bold tabular-nums">
          IMG {pad(index + 1)}/{pad(images.length)}
        </div>
        <div className="flex-1" />
        <div className="flex items-center px-2.5 border-l border-tui-line">
          <button
            aria-label={copied ? 'URL copied' : 'Copy image URL'}
            className={btn}
            onClick={(e) => {
              e.stopPropagation();
              copyUrl();
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'copied' : 'copy url'}
          </button>
        </div>
        <div className="flex items-center px-2.5 border-l border-tui-line">
          <button aria-label="Close" className={btn} onClick={onClose}>
            <X size={12} />
            esc
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="relative flex-1 min-h-0 p-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={image.id}
            className="relative w-full h-full touch-[pan-y_pinch-zoom]"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, { offset }) => {
              if (offset.x < -80 && hasNext) onNavigate(index + 1);
              else if (offset.x > 80 && hasPrev) onNavigate(index - 1);
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* The thumbnail is already cached from the burst, so it paints at
                once and holds the frame until the full-size photo covers it. */}
            <Image
              src={image.thumb_url}
              alt=""
              aria-hidden
              fill
              unoptimized
              className="object-contain"
              sizes="100vw"
            />
            <Image
              src={image.url}
              alt={image.caption ?? ''}
              fill
              unoptimized
              onLoad={warmNeighbours}
              className="object-contain"
              sizes="100vw"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Caption and reactions */}
      {hasFooter && (
        <div className="flex max-sm:flex-col shrink-0 bg-tui-panel border-t border-tui-line">
          {image.caption && (
            <div className="flex-1 min-w-0 px-3 py-2">
              <p className="text-[10px] tracking-widest text-tui-dim mb-1 select-none">CAPTION</p>
              <p className="leading-relaxed">{image.caption}</p>
            </div>
          )}
          <LightboxReactions reactions={reactions} />
        </div>
      )}

      {/* Key hints */}
      <div
        className="flex items-stretch shrink-0 bg-tui-panel border-t border-tui-line text-[11px] text-tui-dim whitespace-nowrap select-none"
        style={{ height: 'calc(var(--tui-bottom-h) + var(--sab))', paddingBottom: 'var(--sab)' }}
      >
        <div className="flex items-center px-2.5 border-r border-tui-line max-sm:hidden">
          <span className="text-tui-accent-text mr-1.5">← →</span> browse
        </div>
        <div className="flex items-center px-2.5 border-r border-tui-line sm:hidden">swipe to browse</div>
        <div className="flex items-center px-2.5 border-r border-tui-line max-sm:hidden">
          <span className="text-tui-accent-text mr-1.5">esc</span> close
        </div>
      </div>
    </motion.div>
  );
}
