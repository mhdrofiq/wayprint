# Wayprint — Progress Tracker

## Milestones

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Map + Static Pins | **Complete** |
| Phase 2 | Burst & Cascade Animations | **Complete** |
| Phase 3 | Backend + Persistence | **Complete** |
| Phase 4 | Image Upload Pipeline | **Complete** |
| Phase 5 | Admin UI + Auth | **Complete** |
| Phase 6 | Polish + Deploy | **Complete** |

---

## Post-launch refinements

### Burst layout overhaul (`lib/burst-layout.ts`)

The original radial scatter layout (photos arranged in a ring around the pin) caused excessive overlap with many photos and shrank thumbnails too aggressively at high counts.

**Changes made:**
- **Thumbnail size fixed at 220px** — removed the `sqrt((vw*vh)/(N*3.5))` formula that shrank photos as count increased.
- **Replaced radial layout with farthest-point placement** — for each photo, 25 random candidate positions are sampled across the full viewport and the one furthest from all already-placed photos is chosen. Photos fill empty areas first and overlap is distributed evenly rather than clustering.
- **Layout no longer centres around the pin** — photos spread across the whole viewport like photographs tossed on a desk. The burst-from-pin animation (Framer Motion `initial` state) is unchanged.
- **Asymmetric padding** — 60px horizontal/top, 110px bottom to clear the pin-label pill.

### Grid toggle button (`PhotoBurstDesktop`, `burst-layout.ts`)

A layout-toggle button was added to the bottom-centre controls in burst view, sitting to the right of the pin label pill.

**Behaviour:**
- In scatter mode: shows a **grid icon** (2×2 squares, SVG). Click to switch to grid layout.
- In grid mode: shows a **scatter icon** (three overlapping rotated rectangles, SVG). Click to return to scattered layout.
- Both layouts are computed up front (memoised independently); toggling is instant.
- Photos animate simultaneously (no stagger) between layouts via Framer Motion spring physics — the `open` variant values update in place without changing the animate state.

**Visual design:**
- Button is a dark pill (`bg-zinc-800`, white icon) to contrast clearly with the white pin label pill.
- Icon-only with a `title` tooltip for accessibility.

**Grid layout (`computeGridLayout` in `lib/burst-layout.ts`):**
- `thumbSize = min(220, maxByWidth, maxByHeight)` — scales down only enough to keep all photos on screen.
- 8px gap between photos; entire grid centred in the viewport.
- `rotation: 0` in grid mode (photos straighten up); ascending `zIndex`.

### Client-side image resize before upload (`components/admin/ImageUploader.tsx`)

Fixed a `JSON.parse` error on upload in production caused by Vercel's 4.5 MB request body limit. Phone photos (e.g. 4080×3060) can be 5–15 MB, so Vercel returned an HTML 413 error page before the function ran, breaking `res.json()` on the client.

**Fix:** added `resizeIfNeeded` in `ImageUploader` — draws the image onto a canvas capped at 2000px on the long edge and exports as JPEG q88 before building the `FormData`. Images already ≤2000px are passed through untouched. Sharp still runs server-side for WebP conversion and thumbnail generation. A 15 MB phone photo is reduced to ~1–2 MB before sending.

---

### Burst view pagination (`lib/burst-layout.ts`, `PhotoBurstDesktop.tsx`, `PhotoCascadeMobile.tsx`)

Pins with many photos (e.g. Ashikaga Flower Park at 40+) rendered too many animated elements simultaneously, hurting performance and readability.

**Changes made:**
- `PAGE_SIZE = 18` exported from `lib/burst-layout.ts` — single source of truth for both desktop and mobile.
- `pageImages` is computed via `useMemo` as a slice of the full `images` array: `images.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)`.
- Layouts (scatter, grid, cascade) are computed from `pageImages`, so stagger timing and placement quality are always based on ≤18 photos.
- **Desktop pagination controls**: prev/next arrow buttons + `X / Y` page counter pill appear in the bottom bar between the label pill and the sheet/grid-toggle buttons. Hidden entirely when `totalPages <= 1` so pins with ≤18 photos see no UI change.
- **Desktop page transition**: the burst photos `motion.div` is wrapped in `AnimatePresence mode="wait"` with `key={page}`. Changing page triggers the full exit animation (photos fly back to pin in reverse stagger) followed by the full enter animation (photos burst out), matching the original open/close feel.
- **Mobile pagination controls**: `‹ X / Y ›` controls added to the sticky header between the pin label and the × close button. Hidden when `totalPages <= 1`.
- **Mobile page transition**: the cascade photos container `<div>` gets `key={page}`, causing React to remount all photos on page change and re-trigger their slide-in entry animation.
- Lightbox operates on `pageImages` (current page only), keeping indices consistent.

---

### Mobile cascade stacking context fix (`MapView.tsx`)

On mobile, the About panel and Last Updated pill were appearing on top of the open cascade view, blocking the sticky header.

**Root cause:** `MapView`'s wrapper div (`fixed inset-2 rounded-xl overflow-hidden`) has `position: fixed`, which always creates a new stacking context in CSS regardless of z-index. The cascade modal's z-index (100/101) was scoped within that context, while `AboutPanel`/`LastUpdated` (z-index 45) lived in the root stacking context — so they always painted above MapView's entire content.

**Fix:** when `burstOpen` is true, `MapView`'s wrapper is given `style={{ zIndex: layers.BACKDROP }}` (100). This elevates MapView's stacking context in the root stack above the about panel overlay. When burst is closed, no z-index is set, so the about panel floats above the map as intended.

---

### About panel + Last Updated (`components/AboutPanel.tsx`, `components/LastUpdated.tsx`, `app/api/last-updated/route.ts`, `MapView.tsx`)

Two floating elements in a shared `fixed top-4 left-4 flex items-start gap-2` container (`zIndex: layers.ADMIN_SHEET - 5`), visible to all users.

**About Panel:** pill button ("🗺️ Wayprint", `bg-zinc-700`, `rounded-xl`) that toggles to a floating card with a description and GitHub/LinkedIn link buttons.

**Last Updated:** light pill (white background, `text-zinc-500`, `rounded-xl`, `shadow-md`) showing the most recent edit timestamp ("Updated D Mon YYYY"). Fetches `GET /api/last-updated` on mount — the route queries `MAX(updated_at)` from `pins` and `MAX(created_at)` from `images` in parallel and returns the later of the two. Renders nothing until the fetch resolves.

---

### Mobile cascade photo border (`PhotoCascadeMobile.tsx`)

Added a thin uniform 5px padding with warm off-white (`#f8f5f0`) background to each photo in the mobile cascade, matching the desktop polaroid aesthetic. The image is clipped inside an inner `overflow-hidden rounded-lg` div so corners stay sharp within the frame. Also added `loading="eager"` for consistency with the desktop burst fix.

---

### Burst view performance improvements (`MapView.tsx`, `PhotoBurstDesktop.tsx`, `BurstPhoto.tsx`)

Targeted at pins with many photos (e.g. 43), where two distinct bottlenecks existed: a visible loading delay on click, and a slow staggered animation.

**Pre-fetch on hover (`MapView.tsx`):**
- `imageCache` ref (plain `Record<string, Image[]>`) stores fetched images by pin ID.
- When `hoveredPin` changes, images are silently fetched and cached in the background (skipped if already cached).
- When a pin is clicked, `selectedPin` effect checks the cache first — if hit, images are set synchronously with no loading state or network round-trip.
- `onImagesChange` writes back to the cache so uploads and deletes stay in sync; stale data is never shown after edits.
- Note: `Map` is shadowed by the MapLibre `Map` component import, so a plain object is used instead.

**Adaptive stagger (`PhotoBurstDesktop.tsx`):**
- `staggerChildren` now `Math.min(0.04, 0.5 / N)` — caps total open animation at 500ms regardless of photo count.
- For 43 photos: ~12ms per photo vs the previous 40ms (1.72s total → 500ms).
- Same cap applied to the collapse stagger (300ms ceiling).

**Eager image loading (`BurstPhoto.tsx`):**
- Added `loading="eager"` to the thumbnail `<Image>`. All burst thumbnails are visible on mount so lazy loading was delaying fetches unnecessarily.

---

### Concurrent upload stale closure fix (`PinEditor.tsx`, `AdminSheet.tsx`)

When multiple photos were uploaded at once, only the last one to complete appeared in the photo list. All concurrent `onUpload` callbacks captured the same stale `images` prop snapshot and each overwrote state with `[...originalImages, imgN]`.

**Fix:** changed `onImagesChange` to accept `Image[] | ((prev: Image[]) => Image[])` (matching React's `SetStateAction` type). All callers in `PinEditor` now use functional updaters (`(prev) => ...`) so each update reads the latest state rather than the closure snapshot. `MapView` passes `setSelectedPinImages` directly, which already accepts both forms.

### Thumbnail resolution improvement (`lib/image-processing.ts`)

Thumbnails were stored at max 400px / quality 70. On 2x Retina displays, the 220px CSS thumbnail requires 440 physical pixels — causing the browser to upscale and blur.

**Fix:** bumped thumbnail cap to **800px** / quality **75**. Next.js image optimization (already configured for R2 via `remotePatterns`) serves the appropriate size per device pixel ratio from the larger source. File size impact is modest (~80–120KB vs ~30–60KB per thumb). Applies to newly uploaded photos only.

### Equal padding in grid mode (`BurstPhoto.tsx`, `PhotoBurstDesktop.tsx`)

Added `equalPadding` boolean prop to `BurstPhoto`. When `true`, padding is uniform `6px` on all sides instead of the polaroid-style `6px 6px 20px 6px`. `PhotoBurstDesktop` passes `equalPadding={isGrid}` so photos appear as square frames in grid mode and revert to polaroid style in scatter mode.

---

### Admin sheet pin navigation (`AdminSheet.tsx`)

Added a minimal navigation row at the top of the pin-selected view so admins can move between pins without going back to the list manually.

**Changes made:**
- `onSelectPin` widened to `(pin: Pin | null) => void` — passing `null` returns to the pins list view. `MapView`'s handler already accepts `Pin | null` state so no changes were needed there.
- `SelectedPinContent` extracted as a dedicated component (was previously inline in the render) — owns the nav row and passes props down to `PinEditor`.
- **Navigation row**: `‹ All pins` text button (left) calls `onSelectPin(null)`; `‹ N / total ›` prev/next chevron buttons (right) call `onSelectPin(pins[idx ± 1])`; both ends disabled with `opacity-25` when at the list boundary.
- `ChevronLeft` / `ChevronRight` extracted as tiny inline SVG components to avoid duplicating the same path.

### "Open in sheet" button in burst view (`PhotoBurstDesktop`, `PhotoBurstSwitch`, `MapView`, `AdminSheet`)

Added a list-icon button in the burst label row (admin only) that closes the burst and jumps directly to the selected pin's photo list in the admin sheet.

**Changes made:**
- `PhotoBurstDesktop` — added optional `onOpenInSheet?: () => void` prop; renders a list-icon dark pill button (same zinc-800 style as the grid toggle) only when the prop is provided.
- `PhotoBurstSwitch` — passes `onOpenInSheet` through to `PhotoBurstDesktop`.
- `MapView` — `onOpenInSheet` is set only when `session` exists (admin only); handler clears `selectedPinScreenPos` (closes burst, keeps `selectedPin`) and increments `sheetExpandRequest`.
- `AdminSheet` — added `expandRequest?: number` prop; a `useEffect` watching it force-expands the sheet to HALF height on each increment, ensuring the sheet is visible even if it was manually collapsed while the burst was open.

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

---

## Phase 4 — Image Upload Pipeline ✓

**Milestone:** Full upload-to-burst pipeline works end to end.

### Prerequisites (manual)
- Cloudflare R2 bucket `wayprint` created with public access enabled
- R2 API token created with Object Read & Write on the bucket
- Env vars added to `.env.local`: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

### Dependencies added
- `sharp` — server-side image resize/compress
- `@aws-sdk/client-s3` — R2 upload/delete via S3-compatible API

### Files created
- `lib/image-processing.ts` — `processImage(buffer)` → `{ full, thumb }` WebP buffers. Auto-corrects EXIF orientation, strips all metadata, resizes within bounds without upscaling.
- `lib/r2.ts` — `uploadToR2(key, buffer, contentType)`, `deleteFromR2(key)`, `r2Keys(pinId, imageId)`. R2 endpoint: `https://{ACCOUNT_ID}.r2.cloudflarestorage.com`.
- `components/admin/ImageUploader.tsx` — Drag-and-drop + file picker. Posts each file as `multipart/form-data` to `POST /api/images`. Shows per-file status (uploading/done/error). Fires `onUpload(image)` callback on success.
- `components/admin/UploadTestPanel.tsx` — Phase 4 test harness only. Floating panel (bottom-right) that appears when a pin is selected. Contains `ImageUploader` + thumbnail grid with delete buttons. Replaced by `AdminSheet` in Phase 5.

### Files modified
- `app/api/images/route.ts` — Full upload pipeline: validate MIME + size, check pin exists, process with sharp, upload both variants to R2 in parallel, store record in Supabase with auto sort_order.
- `app/api/images/[id]/route.ts` — `DELETE` now fetches image record first (for `pin_id`), deletes both R2 objects and the DB row in parallel.
- `components/map/MapView.tsx` — Renders `<UploadTestPanel>` when a pin is selected (Phase 4 only).
- `next.config.ts` — Added `remotePatterns` to whitelist `**.r2.dev` for `next/image`.

### Fixes applied during testing
- `lib/r2.ts` — Added startup validation that throws with the exact missing var name if any R2 env var is absent.
- `components/admin/UploadTestPanel.tsx` — Fixed import: `layers` (lowercase) not `LAYERS`.

### Post-phase refinements
- `components/burst/BurstPhoto.tsx` — Added printed photograph border: warm off-white (`#f8f5f0`) background, `6px 6px 20px 6px` padding (extra bottom for polaroid feel), `rounded-sm` corners. Image moved into inner `overflow-hidden` div. Shadow bumped to `0 4px 24px rgba(0,0,0,0.28)`.


---

## Phase 6 — Polish + Deploy ✓

**Milestone:** Production-ready build deployed to Vercel with toasts, loading states, mobile safe-area support, and map polish.

### Dependencies added
- `sonner` — toast notification library (React 19 compatible, richColors preset)

### Files created
- `vercel.json` — Sets `maxDuration: 30` on `app/api/images/route.ts` so sharp image processing doesn't time out on Vercel cold starts.

### Files modified
- `app/layout.tsx` — Added `<Toaster position="top-center" richColors />`. Added `export const viewport: Viewport` with `viewportFit: "cover"` for iOS safe area support.
- `app/globals.css` — Added `--sab` / `--sat` / `--sal` / `--sar` CSS variables from `env(safe-area-inset-*)`. MapLibre attribution badge made 50% opacity with transparent background; `.maplibregl-ctrl-logo` hidden.
- `components/map/MapView.tsx` — Added `pinsLoading` state: shows a "Loading…" pill over the map while the initial pins fetch resolves. Added `imagesLoading` state: set true when a pin is selected, cleared when images arrive; passed down to burst components. All `console.error` catches replaced with `toast.error(...)`. `toast.error('Failed to create pin')` on map-click pin creation failure. Admin login link bottom position now uses `calc(1rem + var(--sab))` for safe area clearance.
- `components/burst/PhotoBurstSwitch.tsx` — Added `imagesLoading: boolean` prop, forwarded to both desktop and mobile burst components.
- `components/burst/PhotoBurstDesktop.tsx` — Added `imagesLoading` prop. When `imagesLoading && images.length === 0`, renders a "Loading…" pill centered on the pin's screen position instead of the empty scatter layout. Pill label bottom position now uses `calc(1.5rem + var(--sab))`.
- `components/burst/PhotoCascadeMobile.tsx` — Added `imagesLoading` prop. When `imagesLoading && images.length === 0`, renders a centered "Loading…" text below the sticky header.
- `components/admin/AdminSheet.tsx` — Bottom position changed from `bottom-2` to `calc(0.5rem + var(--sab))` so the sheet clears the home indicator on iOS.
- `components/admin/PinEditor.tsx` — All mutations now check `res.ok` before applying optimistic updates. `toast.error(...)` on label save, pin delete, photo delete, and caption save failures. `toast.success('Pin deleted')` on successful deletion. Label field resets to previous value on save failure.
- `components/admin/ImageUploader.tsx` — `toast.success('Photo uploaded')` on successful upload. `toast.error(message)` on failure (in addition to the existing per-file error dot).

### Files deleted
- `lib/mock-data.ts` — Phase 1 leftover (hardcoded pins + images), unused since Phase 3. Caused a TypeScript build error due to `Pin` type mismatch (`created_at`/`updated_at` added in Phase 3).

### Bug fixes
- `lib/image-processing.ts` — Removed `.withMetadata(false)` calls (sharp's API no longer accepts a boolean; metadata is stripped by default).

### Deploy checklist
Environment variables required in Vercel dashboard:
- `NEXT_PUBLIC_MAP_STYLE`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

Post-deploy: add Vercel domain to R2 CORS policy (`AllowedOrigins`, GET method).

---

## Phase 5 — Admin UI + Auth ✓

**Milestone:** Complete admin editing experience via the bottom sheet.


### Prerequisites (manual)
- Create admin user in Supabase dashboard: Authentication → Users → Add user (set email + password)

### Files created
- `lib/auth.ts` — `requireAdmin(request)` helper: reads `Authorization: Bearer <token>` header, validates JWT via `supabase.auth.getUser(token)`. Returns `null` on success or a `401 Response` on failure.
- `lib/supabase-admin.ts` — Service role Supabase client (split out of `lib/supabase.ts` to prevent the server-only key from being bundled into the browser client).
- `app/login/page.tsx` — Dark-themed login form. `signInWithPassword` → `router.replace('/')` on success. Redirects away if already logged in.
- `hooks/useAdminSession.ts` — `useAdminSession()` hook: wraps `supabase.auth.getSession()` + `onAuthStateChange`. Returns `{ session, signOut }`. Used in `MapView`.
- `components/admin/AdminSheet.tsx` — Persistent bottom sheet (always visible when logged in). Light-themed (white background). Positioned at `bottom-2 left-2 right-2` with `rounded-xl` to align within the window padding. Three snap heights: COLLAPSED (48px), HALF (50vh), FULL (70vh). Drag-to-resize via pointer capture on the handle bar. Auto-expands to HALF when a pin is selected or edit mode is toggled on. Two content modes: no-pin-selected (edit mode toggle, pin list, sign out) and pin-selected (`PinEditor`).
- `components/admin/PinEditor.tsx` — Pin label editing (saves on blur/Enter), photo list with per-photo caption editing (saves on blur/Enter) and inline delete confirmation, `ImageUploader` integration, delete-pin with inline confirmation.

### Files modified
- `lib/supabase.ts` — Removed service role client; now exports the anon client only.
- `lib/layers.ts` — Added `ADMIN_SHEET: 50` (below burst backdrop at 100, so burst covers the sheet when open).
- `app/api/pins/route.ts` — `POST` now calls `requireAdmin`. Import updated to `supabase-admin`.
- `app/api/pins/[id]/route.ts` — `PATCH` and `DELETE` now call `requireAdmin`. Import updated to `supabase-admin`.
- `app/api/images/route.ts` — `POST` now calls `requireAdmin`. Import updated to `supabase-admin`.
- `app/api/images/[id]/route.ts` — `PATCH` and `DELETE` now call `requireAdmin`. Import updated to `supabase-admin`.
- `components/admin/ImageUploader.tsx` — Added `token` prop; passes `Authorization: Bearer` header on upload fetch.
- `components/map/MapView.tsx` — Added `useAdminSession`. Burst only renders in view mode (`!isEditMode`). In edit mode, clicking a pin opens it in the sheet (no burst). Clicking empty map in edit mode calls `POST /api/pins` to create a pin. Renders `<AdminSheet>` when logged in. Subtle "Admin" link in corner when logged out. Removed `UploadTestPanel`.

### Files deleted
- `components/admin/UploadTestPanel.tsx` — Phase 4 test harness, replaced by `AdminSheet`.

### Post-phase refinements
- Removed photo reorder feature (↑↓ buttons) — not needed for a personal project.
- `AdminSheet` — light theme (white/zinc-100) instead of original dark theme.
- `AdminSheet` — positioned within window padding (`bottom-2 left-2 right-2 rounded-xl`) so corners align with the map card.

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
