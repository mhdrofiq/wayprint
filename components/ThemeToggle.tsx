'use client';

import { setTheme, useTheme } from '@/lib/theme';

/** Top-bar switch between the light and dark theme. Shows the current one. */
export default function ThemeToggle() {
  const theme = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="flex items-center gap-1.5 px-2.5 border-l border-tui-line hover:bg-tui-raised transition-colors cursor-pointer"
    >
      <span className="text-tui-accent-text" aria-hidden>{theme === 'light' ? '☀' : '☾'}</span>
      <span className="max-sm:hidden">{theme ?? ''}</span>
    </button>
  );
}
