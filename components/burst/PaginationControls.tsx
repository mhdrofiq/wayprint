interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  /** Extra classes for each of the three cells (e.g. wider touch targets). */
  cellClassName?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** ‹ 01/03 › as three cells of a bordered bar; the parent draws the dividers. */
export default function PaginationControls({ page, totalPages, onPrev, onNext, cellClassName = 'px-3' }: PaginationControlsProps) {
  const button = `flex items-center justify-center text-tui-accent-text hover:bg-tui-fg hover:text-tui-bg disabled:text-tui-dim disabled:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer ${cellClassName}`;
  return (
    <>
      <button className={button} onClick={onPrev} disabled={page === 0} title="Previous page" aria-label="Previous page">
        ‹
      </button>
      <div className={`flex items-center justify-center tabular-nums whitespace-nowrap pointer-events-none shrink-0 ${cellClassName}`}>
        {pad(page + 1)}/{pad(totalPages)}
      </div>
      <button className={button} onClick={onNext} disabled={page === totalPages - 1} title="Next page" aria-label="Next page">
        ›
      </button>
    </>
  );
}
