interface BurstEmptyStateProps {
  className?: string;
}

export default function BurstEmptyState({ className = '' }: BurstEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center gap-3 bg-white/90 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-md pointer-events-none select-none ${className}`}>
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        className="text-zinc-300"
        aria-hidden
      >
        {/* Camera body */}
        <rect x="3" y="10" width="30" height="21" rx="3" stroke="currentColor" strokeWidth="2" />
        {/* Viewfinder bump */}
        <path d="M13 10V8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" />
        {/* Lens circle */}
        <circle cx="18" cy="21" r="6" stroke="currentColor" strokeWidth="2" />
        {/* Shutter dot */}
        <circle cx="28" cy="15" r="1.5" fill="currentColor" />
      </svg>
      <p className="text-sm text-zinc-400 font-medium">No photos yet</p>
    </div>
  );
}
