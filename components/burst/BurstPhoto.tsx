'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import type { Image as ImageType, Reaction } from '@/types';
import { layers } from '@/lib/layers';

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
  equalPadding?: boolean;
  onOpenPicker?: (rect: DOMRect) => void;
  ownedReactionIds?: Set<string>;
  onRemoveReaction?: (reactionId: string) => void;
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
  equalPadding = false,
  onOpenPicker,
  ownedReactionIds,
  onRemoveReaction,
}: BurstPhotoProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const reactions: Reaction[] = image.reactions ?? [];
  const atCap = reactions.length >= 15;
  const [hoveredReactionId, setHoveredReactionId] = useState<string | null>(null);

  function handlePickerClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (cardRef.current) {
      onOpenPicker!(cardRef.current.getBoundingClientRect());
    }
  }

  return (
    <motion.div
      ref={cardRef}
      className="absolute pointer-events-auto cursor-pointer rounded-sm group"
      style={{
        width: size,
        height: size,
        zIndex,
        backgroundColor: '#f8f5f0',
        padding: equalPadding ? '6px' : '6px 6px 20px 6px',
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
      whileHover={{ scale: 1.08, zIndex: layers.HOVER_LIFT, rotate: 0 }}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
    >
      {/* Photo */}
      <div className="relative w-full h-full overflow-hidden">
        <Image
          src={image.thumb_url}
          alt={image.caption ?? ''}
          fill
          unoptimized
          loading="eager"
          className="object-cover pointer-events-none"
          sizes={`${size}px`}
        />
      </div>

      {/* Reaction stickers — positioned relative to the card, can overhang */}
      {reactions.map((r) => {
        const isOwned = ownedReactionIds?.has(r.id) ?? false;
        return (
          <div
            key={r.id}
            className="absolute select-none"
            style={{
              left: `${r.pos_x * 100}%`,
              top: `${r.pos_y * 100}%`,
              transform: `translate(-50%, -50%) rotate(${r.rotation}deg)`,
              zIndex: 10,
              pointerEvents: isOwned ? 'auto' : 'none',
            }}
            onMouseEnter={isOwned ? () => setHoveredReactionId(r.id) : undefined}
            onMouseLeave={isOwned ? () => setHoveredReactionId(null) : undefined}
          >
            {/* Emoji + name pill row */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '44px', lineHeight: 1, filter: 'drop-shadow(0 2px 0px rgba(0,0,0,0.8))' }}>
                {r.emoji}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  lineHeight: 1,
                  color: 'white',
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  padding: '3px 7px',
                  borderRadius: '999px',
                  whiteSpace: 'nowrap',
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                }}
              >
                {r.reactor_name}
              </span>
            </div>

            {/* Remove button — only for owned reactions, only on hover */}
            {isOwned && hoveredReactionId === r.id && (
              <button
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-zinc-800 text-white flex items-center justify-center shadow"
                style={{ fontSize: '10px', lineHeight: 1, pointerEvents: 'auto' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveReaction?.(r.id);
                }}
                title="Remove reaction"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}

      {/* Add-reaction button — fades in on hover, hidden at cap */}
      {onOpenPicker && !atCap && (
        <button
          className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-zinc-700/75 hover:bg-zinc-800/90 text-white rounded-full w-6 h-6 flex items-center justify-center text-base font-bold shadow leading-none pointer-events-auto"
          style={{ zIndex: 20 }}
          onClick={handlePickerClick}
          title="Add reaction"
        >
          +
        </button>
      )}
    </motion.div>
  );
}
