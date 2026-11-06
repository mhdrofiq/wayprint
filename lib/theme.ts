'use client';

import { useSyncExternalStore } from 'react';

import { THEME_STORAGE_KEY, type Theme } from '@/lib/theme-config';

export type { Theme };

const THEME_EVENT = 'wayprint-theme';

function readTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  // Follow OS changes while the visitor hasn't picked a theme themselves.
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystem = () => {
    let stored: string | null = null;
    try { stored = localStorage.getItem(THEME_STORAGE_KEY); } catch {}
    if (stored) return;
    applyTheme(mql.matches ? 'dark' : 'light');
  };
  mql.addEventListener('change', onSystem);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    mql.removeEventListener('change', onSystem);
  };
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** Current theme, or null during the server render and hydration (the theme
 *  is only known in the browser). The inline script in the root layout
 *  applies it to the page before paint. */
export function useTheme(): Theme | null {
  return useSyncExternalStore<Theme | null>(subscribe, readTheme, () => null);
}

export function setTheme(theme: Theme) {
  try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch {}
  applyTheme(theme);
}
