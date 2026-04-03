// Z-index layer stack for full-viewport overlays.
// Use these constants instead of magic numbers so the stacking order
// is visible in one place and consistent across components.
export const layers = {
  BACKDROP: 100,
  BURST: 101,
  LABEL: 102,
  LIGHTBOX: 1000,
} as const;
