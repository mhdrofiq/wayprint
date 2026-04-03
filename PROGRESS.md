# Wayprint — Progress Tracker

## Milestones

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Map + Static Pins | **Complete** |
| Phase 2 | Burst & Cascade Animations | **Complete** |
| Phase 3 | Backend + Persistence | **Complete** |
| Phase 4 | Image Upload Pipeline | Not started |

---

## Phase 3 — Backend + Persistence ✓

**Milestone:** Pins and image metadata persist across sessions via Supabase.

### Prerequisites (manual)
- Supabase project created, `pins` and `images` tables created with RLS policies
- 5 seed pins inserted via SQL
- Env vars added to `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### Files created
- `lib/supabase.ts` — Two Supabase clients: `supabase` (anon/browser-safe) and `supabaseAdmin` (service role, server-only).
- `app/api/pins/route.ts` — `GET` (list pins with image counts via nested aggregate), `POST` (create pin).
- `app/api/pins/[id]/route.ts` — `GET` (single pin), `PATCH` (update label + updated_at), `DELETE` (cascade-deletes images via DB foreign key).
- `app/api/pins/[id]/images/route.ts` — `GET` (images for a pin, ordered by sort_order then created_at).
- `app/api/images/route.ts` — `POST` stub (returns 501, implemented in Phase 4).
- `app/api/images/[id]/route.ts` — `PATCH` (caption/sort_order), `DELETE` (record only — R2 cleanup added in Phase 4).

### Files modified
- `types/index.ts` — Added `created_at`, `updated_at` to `Pin`; `image_count?: number` (present on list response only); `created_at` to `Image`.
- `components/map/MapView.tsx` — Removed `PINS`/`IMAGES` mock-data imports. Pins loaded via `useEffect → fetch('/api/pins')`. Images fetched via `fetch('/api/pins/:id/images')` when a pin is selected. New `selectedPinImages` state replaces the hardcoded `IMAGES` map lookup.

### Notes
- All write endpoints use `supabaseAdmin` (service role). JWT enforcement on write routes deferred to Phase 5.
- Dynamic route `params` is a `Promise` in Next.js 16 — all handlers `await params` before destructuring.


| Phase 5 | Admin UI + Auth | Not started |
| Phase 6 | Polish + Deploy | Not started |

---

## Phase 1 — Map + Static Pins ✓

**Milestone:** Map renders with clickable pins.

### Files created
- `types/index.ts` — `Pin` interface (`id`, `label`, `lat`, `lng`)
- `components/map/MapView.tsx` — Full-viewport client component. Renders the MapLibre map using OpenFreeMap tiles (`NEXT_PUBLIC_MAP_STYLE`). Holds 5 hardcoded pins and `selectedPin` state. Shows a `Popup` with the pin label on click. Clicking the map background clears the selection.
- `components/map/PinMarker.tsx` — `Marker` wrapper rendering a styled circular dot. Scales on hover, inverts colors when selected. Stops click propagation to prevent the map's `onClick` from firing simultaneously.

### Post-phase styling improvements
- `components/map/PinMarker.tsx` — Replaced circular dot with 📍 emoji. Added faint drop shadow via inline `filter` style. Changed `anchor` to `"bottom"` so the pin tip aligns precisely with the coordinate. Shadow softened to `drop-shadow(0 4px 8px rgba(0,0,0,0.12))` to match the label bubble.
- `components/map/MapView.tsx` — Map container changed from `fixed inset-0` to `fixed inset-2 rounded-xl overflow-hidden shadow-sm`, giving the map a framed look with slightly rounded corners. Popup offset tuned to `33` to lift the bubble clear of the pin emoji. `closeButton={false}` removes the default X button.
- `app/layout.tsx` — Body background set to `bg-zinc-700` (dark grey), visible as the frame around the map.
- `app/globals.css` — Speech bubble (`.maplibregl-popup-content`) styled: `border-radius: 1.5rem`, `padding: 0.5rem 1rem`, `line-height: 1`, `box-shadow: 0 4px 16px rgba(0,0,0,0.12)`. All values use `!important` to override MapLibre's built-in stylesheet.

### Files modified
- `app/page.tsx` — Replaced Next.js boilerplate with `<MapView />`.
- `app/layout.tsx` — Updated metadata title to "Wayprint" and description to match the project.

---

## Phase 2 — Burst & Cascade Animations ✓

**Milestone:** Clicking a pin triggers a scatter burst (desktop) or vertical cascade (mobile).

### Files created
- `types/index.ts` — Extended with `Image` interface (`id`, `pin_id`, `url`, `thumb_url`, `caption`, `sort_order`) and `ScreenPos` type (`{ x, y }`).
- `lib/burst-layout.ts` — Pure layout functions: `computeScatterLayout` (§8.1 algorithm) and `computeCascadeLayout` (§8.2 algorithm). Uses a seeded pseudo-random number generator (mulberry32) keyed on `pin.id` so scatter positions are stable and don't re-randomise on re-render.
- `components/burst/BurstPhoto.tsx` — Individual Framer Motion animated photo. Springs from pin origin to scatter position. Hover lifts and straightens the photo (`scale: 1.08`, `rotate: 0`, `zIndex: 999`).
- `components/burst/PhotoBurstDesktop.tsx` — Scatter burst for ≥768px. Semi-transparent backdrop, staggered spring animation (`staggerChildren: 0.04`), reverse stagger on collapse. Escape key closes.
- `components/burst/PhotoCascadeMobile.tsx` — Vertical cascade for <768px. Photos slide in from the left, stack with 80% overlap, scrollable container. Sticky pin label + close button at top. Escape key closes.
- `components/burst/PhotoBurstSwitch.tsx` — Reads `window.innerWidth` on mount, listens to `resize`, and renders either `PhotoBurstDesktop` or `PhotoCascadeMobile`. Wraps both in `AnimatePresence`.
- `components/gallery/PhotoLightbox.tsx` — Full-screen overlay. Full-res image with `object-contain`, optional caption, left/right arrow navigation, close via backdrop click, X button, or Escape/Arrow keys.
- `public/photos/photo-1.svg` through `photo-5.svg` — Coloured SVG placeholder images for prototyping (replaced by real uploads in Phase 4).

### Files modified
- `components/map/PinMarker.tsx` — `onClick` callback now returns `ScreenPos` via `getBoundingClientRect()` on the button ref.
- `components/map/MapView.tsx` — Added `selectedPinScreenPos` state. Hardcoded `IMAGES` map (2–4 photos per pin). Renders `<PhotoBurstSwitch>` as a fixed overlay when a pin is selected.

### Post-phase refinements
- `lib/burst-layout.ts` — Tightened scatter distance to a 45%–80% band (was 0%–100%). Reduced angle jitter to ±10° (was ±15°). Added post-clamp exclusion zone (`ceil(half × √2) + 80`px) so photo corners never overlap the pin. Uses seeded RNG (mulberry32) keyed on `pin.id` for stable positions.
- `components/map/MapView.tsx` — Pin label popup now shows on **hover only** (not on click). Map scroll/drag/rotate/zoom disabled while burst is open. `hoveredPin` state separate from `selectedPin`.
- `components/map/PinMarker.tsx` — Added `onHoverEnter`/`onHoverLeave` callbacks. Removed selected-state z-index lift (pin is hidden under backdrop during burst).
- `components/burst/PhotoBurstDesktop.tsx` — Pin and popup are hidden during burst (covered by backdrop). Added bottom-center pill label that springs up from below the viewport on burst open and slides back down on close.
- `components/burst/BurstPhoto.tsx` — Added `pointer-events-auto` (parent container is `pointer-events-none`; this was preventing photo clicks).
- `components/gallery/PhotoLightbox.tsx` — Fixed click-outside-to-close by changing image container from `w-full h-full` to `w-[90vw] h-[80vh]`. Navigation buttons changed to ⬅️ / ➡️ emoji. Caption uses `font-sans`.
- `app/globals.css` — Fixed `--font-sans` to correctly reference `var(--font-geist-sans)` (was circular).

### Hardcoded pins
| Label | Lat | Lng |
|---|---|---|
| Shinjuku, Tokyo | 35.6896 | 139.6917 |
| Gion, Kyoto | 35.0035 | 135.7751 |
| Dotonbori, Osaka | 34.6687 | 135.5019 |
| Odori Park, Sapporo | 43.0620 | 141.3544 |
| Peace Memorial Park, Hiroshima | 34.3955 | 132.4536 |
