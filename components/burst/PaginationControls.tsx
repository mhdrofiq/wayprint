interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function PaginationControls({ page, totalPages, onPrev, onNext }: PaginationControlsProps) {
  return (
    <>
      <button
        className="bg-zinc-800 text-white rounded-full p-2.5 shadow-md hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        onClick={onPrev}
        disabled={page === 0}
        title="Previous page"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div className="bg-white rounded-full px-3 py-2 text-sm font-medium shadow-md whitespace-nowrap pointer-events-none">
        {page + 1} / {totalPages}
      </div>
      <button
        className="bg-zinc-800 text-white rounded-full p-2.5 shadow-md hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        onClick={onNext}
        disabled={page === totalPages - 1}
        title="Next page"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </>
  );
}
