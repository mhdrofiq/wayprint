'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import type { Image as ImageType } from '@/types';
import { layers } from '@/lib/layers';

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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(index - 1);
      if (e.key === 'ArrowRight' && hasNext) onNavigate(index + 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, hasPrev, hasNext, onClose, onNavigate]);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ zIndex: layers.LIGHTBOX }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85" />

      {/* Image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={image.id}
          className="relative z-10 w-[90vw] h-[80vh]"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            src={image.url}
            alt={image.caption ?? ''}
            fill
            unoptimized
            className="object-contain"
            sizes="90vw"
          />
        </motion.div>
      </AnimatePresence>

      {/* Caption */}
      {image.caption && (
        <p className="relative z-10 mt-4 text-white/80 text-sm text-center max-w-lg px-4 font-sans">
          {image.caption}
        </p>
      )}

      {/* Close button */}
      <button
        className="absolute top-4 right-4 z-10 text-white/70 hover:text-white"
        onClick={onClose}
      >
        <X size={28} />
      </button>

      {/* Prev */}
      {hasPrev && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white/70 hover:text-white"
          onClick={(e) => { e.stopPropagation(); onNavigate(index - 1); }}
        >
          <ArrowLeft size={36} />
        </button>
      )}

      {/* Next */}
      {hasNext && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white/70 hover:text-white"
          onClick={(e) => { e.stopPropagation(); onNavigate(index + 1); }}
        >
          <ArrowRight size={36} />
        </button>
      )}
    </motion.div>
  );
}
