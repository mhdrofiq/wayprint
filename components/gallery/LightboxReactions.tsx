'use client';

import type { Reaction } from '@/types';

interface LightboxReactionsProps {
  reactions: Reaction[];
}

/** Read-only list of a photo's reactions, in the lightbox footer. */
export default function LightboxReactions({ reactions }: LightboxReactionsProps) {
  if (reactions.length === 0) return null;

  return (
    <div
      className="px-3 py-2 sm:max-w-[45%] sm:border-l max-sm:border-t border-tui-line"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-[10px] tracking-widest text-tui-dim mb-1 select-none">
        REACTIONS [{reactions.length}]
      </p>
      <div className="flex flex-row flex-wrap gap-1.5">
        {reactions.map((r) => (
          <div key={r.id} className="flex items-center gap-1.5 border border-tui-line-strong px-1.5 py-0.5 select-none">
            <span style={{ fontSize: '18px', lineHeight: 1 }}>{r.emoji}</span>
            <span className="whitespace-nowrap">{r.reactor_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
