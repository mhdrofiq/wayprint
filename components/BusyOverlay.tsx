'use client';

import { useEffect, useState } from 'react';
import { layers } from '@/lib/layers';

const SPINNER_FRAMES = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';

/** A terminal-style braille spinner. */
function Spinner() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 80);
    return () => clearInterval(id);
  }, []);
  return <span className="text-tui-accent-text font-bold" aria-hidden>{SPINNER_FRAMES[frame]}</span>;
}

/** Greys out the whole screen and swallows input while an admin operation runs. */
export default function BusyOverlay({ status }: { status: string | null }) {
  return (
    <div
      role="status"
      aria-label={status ?? 'Working'}
      className="fixed inset-0 bg-tui-bg/80 flex items-center justify-center px-4 cursor-wait text-xs text-tui-fg"
      style={{ zIndex: layers.FREEZE }}
    >
      <div className="flex items-center gap-2 bg-tui-panel border border-tui-fg px-3 py-2 tabular-nums">
        <Spinner />
        <span>{status ?? 'working…'}</span>
      </div>
    </div>
  );
}
