interface BurstEmptyStateProps {
  className?: string;
}

export default function BurstEmptyState({ className = '' }: BurstEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center gap-1 bg-tui-panel text-tui-fg border border-tui-fg px-6 py-4 text-xs pointer-events-none select-none ${className}`}>
      <span className="text-tui-accent-text text-base" aria-hidden>[ ∅ ]</span>
      <p>No photos yet</p>
    </div>
  );
}
