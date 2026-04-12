'use client';

import type { Reaction } from '@/types';

interface LightboxReactionsProps {
  reactions: Reaction[];
}

export default function LightboxReactions({ reactions }: LightboxReactionsProps) {
  if (reactions.length === 0) return null;

  return (
    <div
      className="absolute top-4 left-4 z-10 flex flex-col gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="text-white/50 text-xs uppercase tracking-widest font-sans select-none">
        Reactions
      </span>
      <div className="flex flex-row flex-wrap gap-2">
        {reactions.map((r) => (
          <div key={r.id} className="flex items-center gap-1.5">
            <span
              className="select-none"
              style={{ fontSize: '32px', lineHeight: 1, filter: 'drop-shadow(0 2px 0px rgba(0,0,0,0.8))' }}
            >
              {r.emoji}
            </span>
            <span
              className="text-white select-none"
              style={{
                fontSize: '11px',
                lineHeight: 1,
                backgroundColor: 'rgba(255,255,255,0.15)',
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
        ))}
      </div>
    </div>
  );
}
