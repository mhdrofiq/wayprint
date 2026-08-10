'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Check, Copy, X } from 'lucide-react';
import type { Image as ImageType } from '@/types';
import { layers } from '@/lib/layers';
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
  const [copied, setCopied] = useState(false);

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
  }, [image.id]);

  async function copyUrl() {
    const url = new URL(image.url, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

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
          className="relative z-10 w-[90vw] h-[80vh] touch-[pan-y_pinch-zoom]"
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

      {/* Copy URL button — top-left */}
      <button
        aria-label={copied ? 'URL copied' : 'Copy image URL'}
        className="absolute top-4 left-4 z-20 flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs text-white backdrop-blur-md hover:bg-white/25 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          copyUrl();
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        <span className="font-sans">{copied ? 'Copied' : 'Copy URL'}</span>
      </button>

      {/* Reactions panel — below the copy button, hidden when empty */}
      <LightboxReactions reactions={image.reactions ?? []} />

      {/* Caption */}
      {image.caption && (
        <p className="relative z-10 mt-3 text-white/80 text-sm text-center max-w-lg px-4 font-sans">
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

    </motion.div>
  );
}
