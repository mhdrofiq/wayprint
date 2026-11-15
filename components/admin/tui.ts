// Class strings for the admin UI, in the public TUI look (DESIGN.md §8):
// sharp corners, 1px borders, cells that invert on hover, one amber accent.

const cellBase =
  'inline-flex items-center justify-center gap-1.5 h-6 px-2 border text-xs whitespace-nowrap transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

/** Idle cell button: outlined, inverts on hover. */
export const cell = `${cellBase} border-tui-line-strong hover:bg-tui-fg hover:text-tui-bg disabled:hover:bg-transparent disabled:hover:text-current`;
/** Active / toggled-on cell. */
export const cellOn = `${cellBase} border-tui-fg bg-tui-fg text-tui-bg`;
/** Primary action: amber fill. */
export const cellAccent = `${cellBase} border-tui-fg bg-tui-accent text-tui-accent-fg font-bold hover:brightness-95`;
/** Destructive action that still needs confirming. */
export const cellDanger = `${cellBase} border-tui-danger text-tui-danger hover:bg-tui-danger hover:text-tui-panel`;
/** The confirming destructive action. */
export const cellDangerSolid = `${cellBase} border-tui-danger bg-tui-danger text-tui-panel font-bold hover:brightness-110`;

/** Text input, textarea or select. */
export const field =
  'bg-tui-bg border border-tui-line-strong px-2 py-1.5 text-xs text-tui-fg outline-none focus:border-tui-accent placeholder:text-tui-dim';

/** Small section label. */
export const sectionLabel = 'text-[10px] tracking-widest uppercase text-tui-dim';

/** Dashed placeholder box for empty or loading states. */
export const placeholderBox = 'text-xs text-tui-dim text-center py-6 border border-dashed border-tui-line-strong';
