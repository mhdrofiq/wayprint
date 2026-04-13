// Z-index layer stack for full-viewport overlays.
// Use these constants instead of magic numbers so the stacking order
// is visible in one place and consistent across components.
export const layers = {
  ADMIN_SHEET: 50,   // below burst backdrop — burst covers the sheet when open
  BACKDROP: 100,
  BURST: 101,
  LABEL: 102,
  HOVER_LIFT: 999, // burst photo hovered — lifts above siblings but below lightbox
  LIGHTBOX: 1000,
  CONFIRMATION_BACKDROP: 1100, // removal confirmation modal backdrop
  CONFIRMATION: 1101,          // removal confirmation modal content
} as const;
