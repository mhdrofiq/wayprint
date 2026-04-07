'use client';

import { useEffect, useState } from 'react';

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function LastUpdated() {
  const [timestamp, setTimestamp] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/last-updated')
      .then((r) => r.json())
      .then((d) => setTimestamp(d.timestamp ?? null))
      .catch(() => {});
  }, []);

  if (!timestamp) return null;

  return (
    <div className="text-zinc-500 rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap bg-white shadow-md">
      Updated {formatTimestamp(timestamp)}
    </div>
  );
}
