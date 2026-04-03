'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import type { Image as ImageType } from '@/types';

interface BurstPhotoProps {
  image: ImageType;
  targetX: number;
  targetY: number;
  rotation: number;
  size: number;
  zIndex: number;
  originX: number;
  originY: number;
  onOpen: () => void;
}

export default function BurstPhoto({
  image,
  targetX,
  targetY,
  rotation,
  size,
  zIndex,
  originX,
  originY,
  onOpen,
}: BurstPhotoProps) {
  return (
    <motion.div
      className="absolute pointer-events-auto cursor-pointer rounded-sm"
      style={{
        width: size,
        height: size,
        zIndex,
        backgroundColor: '#f8f5f0',
        padding: '6px 6px 20px 6px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.28)',
      }}
      variants={{
        closed: {
          x: originX - size / 2,
          y: originY - size / 2,
          scale: 0,
          opacity: 0,
          rotate: 0,
        },
        open: {
          x: targetX,
          y: targetY,
          scale: 1,
          opacity: 1,
          rotate: rotation,
        },
      }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 22,
      }}
      whileHover={{ scale: 1.08, zIndex: 999, rotate: 0 }}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
    >
      <div className="relative w-full h-full overflow-hidden">
        <Image
          src={image.thumb_url}
          alt={image.caption ?? ''}
          fill
          className="object-cover pointer-events-none"
          sizes={`${size}px`}
        />
      </div>
    </motion.div>
  );
}
