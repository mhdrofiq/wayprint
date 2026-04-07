# Wayprint — Design Document

## 1. Overview

**Wayprint** is a personal, location-based photo gallery web app. Users drop pins on a map of Japan, upload photos to each pin, and when a pin is clicked, the photos burst outward in an animated explosion. The map is publicly viewable, but only the owner can add pins and upload photos.

It's a spatial photo diary — the map is the organizing principle, and the burst animation is the signature interaction.

### Goals

- Build a visually polished, portfolio-worthy personal project.
- Prioritize the **feel** of the burst animation — this is the core experience.
- Responsive design that works equally well on desktop and mobile.
- Low-cost, long-lasting infrastructure for personal use (2–3 viewers).

---

## 2. Tech Stack

| Layer            | Technology                      | Rationale                                                                 |
|------------------|---------------------------------|---------------------------------------------------------------------------|
| Framework        | Next.js 16 (App Router) + TypeScript | Production-grade React framework, image optimization, file-based routing. |
| Map              | MapLibre GL JS via `@vis.gl/react-maplibre` | Open-source fork of Mapbox GL JS. WebGL rendering, smooth interactions, 3D terrain support. No API key required when paired with OpenFreeMap tiles. |
| Map Tiles        | OpenFreeMap                     | Free, unlimited vector tile hosting for OpenStreetMap data. No registration, no API keys, no usage limits. Funded by donations. |
| Animation        | Framer Motion                   | Spring physics, staggered animations, layout transitions. Best React animation library for this use case. |
| Styling          | Tailwind CSS + shadcn/ui        | Utility-first CSS with high-quality, customizable UI primitives.          |
| Database         | Supabase (Postgres)             | Hosted Postgres with JS client, row-level security, and auth.            |
| Image Storage    | Cloudflare R2                   | S3-compatible, 10GB free, zero egress fees.                              |
| Image Processing | sharp (server-side)             | Resize and compress uploads to WebP before storing.                      |
| Auth             | Supabase Auth                   | Simple email/password or magic link for the single admin user.           |
| Deployment       | Vercel                          | Seamless Next.js deployment, auto-deploys from GitHub, free tier.        |

### Estimated Monthly Cost (5–10GB photos, 2–3 users)

| Service         | Free Tier Covers | Estimated Cost |
|-----------------|------------------|----------------|
| Vercel          | 100GB bandwidth  | $0             |
| Supabase        | 500MB DB, auth   | $0             |
| Cloudflare R2   | 10GB storage     | $0–$1          |
| OpenFreeMap      | Unlimited        | $0             |
| **Total**       |                  | **$0–$1/month** |

---

## 3. Data Model

### `pins` table

| Column       | Type                    | Description                              |
|--------------|-------------------------|------------------------------------------|
| `id`         | `uuid` (PK, default)    | Unique pin identifier.                   |
| `label`      | `text`                  | Short display name (e.g., "Hareruya Ikebukuro"). |
| `lat`        | `double precision`      | Latitude.                                |
| `lng`        | `double precision`      | Longitude.                               |
| `created_at` | `timestamptz` (default) | When the pin was created.                |
| `updated_at` | `timestamptz` (default) | Last modification time.                  |

### `images` table

| Column       | Type                    | Description                              |
|--------------|-------------------------|------------------------------------------|
| `id`         | `uuid` (PK, default)    | Unique image identifier.                 |
| `pin_id`     | `uuid` (FK → pins.id)   | Which pin this image belongs to.         |
| `url`        | `text`                  | Full URL to the image on R2.             |
| `thumb_url`  | `text`                  | URL to the compressed thumbnail on R2.   |
| `caption`    | `text` (nullable)       | Optional short caption.                  |
| `sort_order` | `integer` (default 0)   | Order within the pin's gallery.          |
| `created_at` | `timestamptz` (default) | When the image was uploaded.             |

### Relationships

- `pins` 1 → N `images` (one pin has many images).
- Cascade delete: deleting a pin deletes its images (DB-level + trigger to clean up R2 objects).

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Client (Browser)                │
│                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ MapLibre │  │ Framer Motion│  │ shadcn/ui     │  │
│  │ Map View │  │ Burst Anim.  │  │ Upload/Edit UI│  │
│  └────┬─────┘  └──────┬───────┘  └───────┬───────┘  │
│       │               │                  │          │
│       └───────────────┼──────────────────┘          │
│                       │                             │
└───────────────────────┼─────────────────────────────┘
                        │ HTTPS
          ┌─────────────┼─────────────────┐
          │      Next.js on Vercel        │
          │                               │
          │  ┌─────────────────────────┐   │
          │  │   API Routes            │   │
          │  │   /api/pins (CRUD)      │   │
          │  │   /api/images (upload)  │   │
          │  └────┬──────────┬────────┘   │
          │       │          │            │
          └───────┼──────────┼────────────┘
                  │          │
       ┌──────────┘          └──────────┐
       │                                │
 ┌─────▼──────┐                  ┌──────▼───────┐
 │  Supabase  │                  │ Cloudflare   │
 │  Postgres  │                  │ R2 (images)  │
 │  + Auth    │                  │              │
 └────────────┘                  └──────────────┘
```

### Key Architecture Decisions

1. **Next.js API routes** act as the backend — no separate server needed.
2. **Image uploads go through the API route**, which runs `sharp` to resize/compress, then uploads to R2, and stores the resulting URL in Supabase.
3. **Public visitors** hit a server-rendered or statically-generated page that fetches all pins and renders the map. No auth required to view.
4. **Admin (you)** logs in via Supabase Auth to access the edit UI (add pins, upload photos, delete, reorder).

---

## 5. Use Case Flows

### 5.1 Visitor Views the Map (Public, No Auth)

1. Visitor opens the site.
2. Next.js serves the page. On load, the client fetches all pins from `/api/pins` (returns pins with image counts but not full image data).
3. MapLibre renders the map of Japan with pin markers.
4. Visitor clicks a pin.
5. Client fetches `/api/pins/:id/images` for that pin's images.
6. Framer Motion animates the photo burst — thumbnails radiate outward from the pin's position on the map.
7. Visitor can click an individual photo to see it at full resolution in a lightbox overlay.
8. Clicking away from the burst or pressing Escape collapses the photos back into the pin.

### 5.2 Admin Adds a New Pin

1. Admin logs in (Supabase Auth — email + password or magic link).
2. Admin expands the bottom sheet and toggles edit mode on.
3. Admin clicks a location on the map.
4. The bottom sheet auto-expands to the pin editor view with the **Label** field focused.
5. Admin fills in the label and confirms.
6. `POST /api/pins` creates the pin in Supabase.
7. The pin appears on the map immediately.

### 5.3 Admin Uploads Photos to a Pin

1. Admin clicks an existing pin (in edit mode).
2. The bottom sheet auto-expands to show the pin's details: label, current photos, and the upload zone.
3. Admin drags and drops or selects one or more images.
4. For each image:
   a. Client sends the file to `POST /api/images` with the `pin_id`.
   b. API route receives the file, runs `sharp` to:
      - Create a **full-size** version: resize to max 2000px on the long edge, convert to WebP, quality 80.
      - Create a **thumbnail**: resize to max 400px, convert to WebP, quality 70.
   c. Both versions are uploaded to Cloudflare R2.
   d. The resulting URLs are stored in the `images` table in Supabase.
5. The new photos appear in the pin's gallery.
6. Admin can optionally add a caption to each photo.

### 5.4 Admin Deletes a Photo

1. Admin clicks a pin in edit mode; the bottom sheet shows the pin's photos.
2. Admin clicks a delete button on a photo.
3. Confirmation dialog appears.
4. On confirm: `DELETE /api/images/:id` removes the record from Supabase and deletes the files from R2.

### 5.5 Admin Deletes a Pin

1. Admin clicks a pin in edit mode.
2. Admin clicks "Delete Pin."
3. Confirmation dialog warns that all photos will be deleted.
4. On confirm: `DELETE /api/pins/:id` cascade-deletes images from Supabase and triggers cleanup of R2 files.
5. Pin disappears from the map.

### 5.6 Admin Edits a Pin

1. Admin clicks a pin in edit mode.
2. Admin can edit the **label**.
3. Changes are saved via `PATCH /api/pins/:id`.

---

## 6. API Routes

All routes are Next.js App Router API routes (`app/api/...`).

### Pins

| Method   | Route              | Auth     | Description              |
|----------|--------------------|----------|--------------------------|
| `GET`    | `/api/pins`        | Public   | List all pins with image counts. |
| `GET`    | `/api/pins/:id`    | Public   | Get a single pin with its images. |
| `POST`   | `/api/pins`        | Admin    | Create a new pin.        |
| `PATCH`  | `/api/pins/:id`    | Admin    | Update pin label.        |
| `DELETE` | `/api/pins/:id`    | Admin    | Delete pin and all its images. |

### Images

| Method   | Route                     | Auth     | Description                          |
|----------|---------------------------|----------|--------------------------------------|
| `GET`    | `/api/pins/:id/images`    | Public   | Get all images for a pin.            |
| `POST`   | `/api/images`             | Admin    | Upload image(s) to a pin.            |
| `PATCH`  | `/api/images/:id`         | Admin    | Update caption or sort order.        |
| `DELETE` | `/api/images/:id`         | Admin    | Delete an image (DB + R2 cleanup).   |

### Auth

Supabase Auth handles login/logout. The API routes validate the Supabase JWT on admin-only endpoints.

---

## 7. UI Components

### 7.1 Map View (`MapView`)

- Full-viewport MapLibre GL JS map, using OpenFreeMap vector tiles.
- Default center: Tokyo (~35.68°N, 139.69°E), zoom level 11.
- Custom pin markers — 📍 emoji with drop shadow. Scales on hover.
- Pin label appears in a speech-bubble popup **on hover only** (not on click).
- Clicking a pin opens the photo burst. All map interactions (scroll, drag, rotate) are disabled while the burst is open.
- In edit mode, clicking empty space on the map opens the "new pin" form.

### 7.2 Photo Burst — Desktop (`PhotoBurstDesktop`)

- Triggered when a pin is clicked.
- A **semi-transparent backdrop** dims the map behind the burst.
- Photos are scattered across the full viewport in a **loose, organic layout** — like printed photographs tossed onto a desk.
- The layout uses **farthest-point placement**: each photo is placed at whichever of 25 random candidate positions is furthest from already-placed photos. This naturally fills empty areas first and prevents clustering, while still looking random.
- Photos **deliberately overlap** (each photo has a random z-index) to create a tactile, paper-like feel. Think scattered polaroids, not a neat grid.
- Thumbnail size is fixed at **220px** regardless of photo count — photos never shrink.
- Each photo has: rounded corners, a subtle drop shadow, and a slight random rotation (±10°).
- The map pin and popup label are **hidden** during the burst. Instead, a white pill-shaped label containing the pin's name appears at the **bottom center** of the viewport and animates up from below the screen edge using a spring transition. Immediately to the right of the label sits a dark pill-shaped toggle button (zinc-800) with an icon:
  - **Grid icon** (2×2 squares) when in scatter mode — click to arrange photos as a grid.
  - **Scatter icon** (three overlapping rotated rectangles) when in grid mode — click to return to the scattered layout.
  - Both layouts animate smoothly via Framer Motion spring physics; all photos move simultaneously on toggle (no stagger).
- Framer Motion handles the animation:
  - `initial`: all photos stacked at the pin's position, scale 0, opacity 0.
  - `animate`: photos spring outward to their scattered positions, scale 1, opacity 1.
  - `transition`: spring physics with staggered delay (`staggerChildren: 0.04`).
- Clicking a photo opens it full-size in the lightbox.
- Clicking the backdrop or pressing Escape triggers the **collapse animation** (photos spring back into the pin and disappear; bottom label slides back down).
- Photos are rendered as an **overlay on top of the map**, not as MapLibre markers (gives full CSS/animation control).

### 7.3 Photo Cascade — Mobile (`PhotoCascadeMobile`)

- On mobile (screen width < 768px), the burst is replaced by a **vertical cascade**.
- When a pin is tapped, photos slide in from either the left or right side of the screen (alternating or fixed — TBD during implementation) and stack vertically.
- The layout resembles a **loose stack of printed photographs**: each photo is slightly offset horizontally, with a small random rotation (±3–5°), and overlaps the previous one by ~15–20%.
- The cascade is **scrollable** — the user simply scrolls down to see all photos. No pagination or "show more" button.
- A semi-transparent backdrop covers the map. The pin label is shown at the top of the cascade.
- Tapping a photo opens it full-size in the lightbox.
- Tapping the backdrop, swiping down, or pressing the back button collapses the cascade (photos slide back off-screen).

### 7.4 Photo Lightbox (`PhotoLightbox`)

- Full-screen overlay with a darkened backdrop.
- Shows the full-resolution image (`90vw × 80vh` container with `object-contain`).
- Caption displayed below in sans-serif font.
- Left/right navigation using ⬅️ / ➡️ emoji buttons, also controllable via arrow keys.
- Close by clicking outside the image area, pressing Escape, or the X button.

### 7.5 Admin Bottom Sheet (`AdminSheet`)

A single, unified bottom sheet that houses **all admin controls**. Appears only when logged in. Light-themed (white background), positioned within the window padding so it aligns with the map card corners.

**Collapsed state (default):**
- A thin, persistent handle bar at the bottom of the screen.
- Doesn't interfere with the map or burst interactions.
- Drag up or tap to expand.

**Expanded state — No pin selected:**
- Toggle edit mode on/off (when edit mode is on, clicking the map creates a pin).
- A scrollable list of all pins for quick navigation.
- Sign out button.

**Expanded state — Pin selected:**
- The sheet auto-expands when a pin is tapped in edit mode.
- **Pin section**: label field (editable inline, saves on blur/Enter).
- **Photos section**: list of existing photos, each with a caption field (saves on blur/Enter) and a delete button with inline confirmation.
- **Upload section**: drag-and-drop zone at the bottom. Supports multiple files. Shows per-file upload progress.
- **Delete pin**: button at the bottom with inline confirmation.

**Behavior:**
- Drag-to-resize via pointer capture on the handle bar. Snaps to three heights: COLLAPSED (48px handle only), HALF (50vh), FULL (70vh).
- Auto-expands to HALF when a pin is selected in edit mode or when edit mode is first toggled on.
- Sits at `bottom-2 left-2 right-2` within the window padding, with `rounded-xl` corners matching the map card.
- The sheet never covers the entire map — max height is ~70% of the viewport.

### 7.6 Login Page (`/login`)

- Simple, clean login form. Dark-themed, centered.
- Email + password. Admin account created once manually in the Supabase dashboard — no registration flow in the app.
- Redirects to `/` on success. Redirects away automatically if already logged in.
- A subtle "Admin" link in the bottom-right corner of the map page links here when logged out.

---

## 8. Animation Specification

This is the heart of the app. The animation should feel **physical, organic, and satisfying** — like tossing a handful of printed photos onto a table.

### 8.1 Desktop — Scatter Burst

The goal is to fill the viewport with photos that feel casually scattered, like printed photographs tossed onto a desk.

#### Layout Algorithm

```
Given N photos and viewport (vw, vh):

  // Fixed thumbnail size — never shrinks regardless of photo count.
  thumbSize = 220px
  half = thumbSize / 2

  // Asymmetric padding — extra bottom space for the pin-label pill.
  padH = 60px
  padV = { top: 60px, bottom: 110px }

  // Farthest-point placement: for each photo, sample K=25 random candidate
  // positions and pick whichever is furthest from all already-placed photo
  // centres. This naturally repels photos from each other and spreads them
  // across the viewport without producing a visible grid.
  placed = []

  For each photo i:
    bestCx, bestCy = 0, 0
    bestMinDist = -∞

    For attempt in 1..25:
      cx = randomRange(padH + half, vw - padH - half)
      cy = randomRange(padV.top + half, vh - padV.bottom - half)

      minDist = min distance from (cx, cy) to all centres in placed
               (∞ if placed is empty)

      if minDist > bestMinDist:
        bestMinDist = minDist
        bestCx, bestCy = cx, cy

    placed.append({ cx: bestCx, cy: bestCy })

    x = clamp(bestCx - half, padH, vw - padH - thumbSize)
    y = clamp(bestCy - half, padV.top, vh - padV.bottom - thumbSize)

    // Paper-like appearance
    rotation = randomRange(-12°, 12°)
    zIndex = randomInt(1, N)                  // random stacking order

    delay = i * 0.04s                         // stagger
```

#### Framer Motion Configuration

```typescript
// Container — covers the full viewport as an overlay
<AnimatePresence>
  {isOpen && (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Scattered photos */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        initial="closed"
        animate="open"
        exit="closed"
        variants={{
          open: { transition: { staggerChildren: 0.04 } },
          closed: { transition: { staggerChildren: 0.025, staggerDirection: -1 } },
        }}
      >
        {photos.map((photo, i) => {
          const layout = computeScatterPosition(i, photos.length, pinPos, viewport);
          return (
            <BurstPhoto
              key={photo.id}
              photo={photo}
              targetX={layout.x}
              targetY={layout.y}
              rotation={layout.rotation}
              size={layout.thumbSize}
              zIndex={layout.zIndex}
              originX={pinPos.x}
              originY={pinPos.y}
            />
          );
        })}
      </motion.div>
    </>
  )}
</AnimatePresence>

// Individual photo
<motion.div
  className="absolute pointer-events-auto cursor-pointer"
  style={{ zIndex, width: size, height: size }}
  variants={{
    closed: {
      x: originX,
      y: originY,
      scale: 0,
      opacity: 0,
      rotate: 0,
    },
    open: {
      x: targetX,
      y: targetY,
      scale: 1,
      opacity: 1,
      rotate: rotation,
    },
  }}
  transition={{
    type: "spring",
    stiffness: 260,
    damping: 22,
  }}
  whileHover={{ scale: 1.08, zIndex: 999, rotate: 0 }}
  onClick={() => openLightbox(photo)}
/>
```

#### Overlap & Stacking

- Photos are **expected to overlap** — this is intentional, not a bug. At high photo counts some overlap is mathematically unavoidable at 220px; the farthest-point algorithm distributes it evenly rather than letting photos pile up in one area.
- Random z-index creates a natural stacking order.
- On hover, a photo lifts above others (`zIndex: 999`) and straightens its rotation, making it easy to inspect.
- The slight scale-up on hover provides a clear affordance that the photo is clickable.

#### Grid Layout Algorithm (toggle)

```
Given N photos and viewport (vw, vh):

  padH = 60px, padTop = 60px, padBottom = 110px
  gap = 8px
  availW = vw - 2 * padH
  availH = vh - padTop - padBottom

  cols = round(sqrt(N * availW / availH))
  rows = ceil(N / cols)

  // Scale thumbSize down only enough to fit; cap at 220px.
  maxByWidth  = floor((availW - (cols - 1) * gap) / cols)
  maxByHeight = floor((availH - (rows - 1) * gap) / rows)
  thumbSize   = min(220, maxByWidth, maxByHeight)

  // Centre the entire grid in the available area.
  gridW  = cols * thumbSize + (cols - 1) * gap
  gridH  = rows * thumbSize + (rows - 1) * gap
  startX = padH + (availW - gridW) / 2
  startY = padTop + (availH - gridH) / 2

  For each photo i:
    col = i % cols
    row = floor(i / cols)

    // Centre any partial last row.
    photosInRow = (row == rows - 1) ? ((N - 1) % cols) + 1 : cols
    rowOffset   = ((cols - photosInRow) * (thumbSize + gap)) / 2

    x = startX + rowOffset + col * (thumbSize + gap)
    y = startY + row * (thumbSize + gap)

    rotation = 0          // photos are straight in grid mode
    zIndex   = i + 1      // ascending — later photos on top
```

- Switching between scatter and grid animates all photos simultaneously (no stagger) via Framer Motion spring physics.
- Overlap is permitted if the photo count is large enough that even the scaled-down `thumbSize` produces a grid larger than the available area.

### 8.2 Mobile — Vertical Cascade

On screens narrower than 768px, the scatter burst is replaced by a cascade that feels like flipping through a stack of prints.

#### Layout

```
Given N photos and viewport width vw:

  // Photos are large — nearly full width
  photoWidth = vw * 0.75
  photoHeight = photoWidth * 0.75  // 4:3 aspect ratio container

  // Offset from one side of the screen
  side = "left" or "right" (consistent per pin, or alternating — TBD)
  baseX = side == "left" ? vw * 0.05 : vw * 0.20

  // Vertical stacking with generous overlap
  overlapFactor = 0.80  // each photo overlaps 80% of the previous
  stepY = photoHeight * (1 - overlapFactor)

  For each photo i:
    targetX = baseX + randomRange(-8px, 8px)    // slight horizontal jitter
    targetY = topPadding + (stepY * i)
    rotation = randomRange(-3°, 3°)              // subtle tilt
    zIndex = i                                   // later photos stack on top
```

#### Animation

```typescript
// Container — scrollable column
<motion.div
  className="fixed inset-0 overflow-y-auto"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
>
  {/* Pin label at the top */}
  <motion.h2 className="sticky top-0 z-50 p-4">{pin.label}</motion.h2>

  {/* Cascading photos */}
  <div className="relative" style={{ height: totalStackHeight }}>
    {photos.map((photo, i) => (
      <motion.div
        key={photo.id}
        className="absolute"
        style={{ zIndex: i, width: photoWidth }}
        initial={{ x: side === "left" ? -vw : vw, opacity: 0, rotate: 0 }}
        animate={{
          x: targetX,
          y: targetY,
          opacity: 1,
          rotate: rotation,
        }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 24,
          delay: i * 0.05,
        }}
        onClick={() => openLightbox(photo)}
      />
    ))}
  </div>
</motion.div>
```

#### Scrolling Behavior

- The cascade container is scrollable. The user scrolls naturally to see all photos.
- Photos slide in from off-screen (left or right) as the animation plays.
- The backdrop is fully opaque or heavily dimmed since the cascade covers most of the map anyway.
- Tapping the X button, swiping down from the top, or pressing back collapses the cascade — photos slide back off-screen in reverse order.

### 8.3 Breakpoint Strategy

| Viewport Width | Layout Mode    | Thumbnail Size    |
|----------------|----------------|-------------------|
| ≥ 768px        | Scatter burst   | Dynamic (100–220px, based on photo count and viewport) |
| < 768px        | Vertical cascade | 75% of viewport width |

---

## 9. Image Processing Pipeline

All image processing happens server-side in the Next.js API route before storing.

### On Upload

1. Receive the raw file from the client.
2. Read image metadata (EXIF) — extract GPS coordinates if present (optional: auto-suggest pin location).
3. **Full-size version**: resize to max **2000px** on the long edge, convert to **WebP**, quality **80**. Strip EXIF data (privacy).
4. **Thumbnail version**: resize to max **400px** on the long edge, convert to **WebP**, quality **70**.
5. Upload both to Cloudflare R2 with structured keys:
   - `images/{pin_id}/{image_id}/full.webp`
   - `images/{pin_id}/{image_id}/thumb.webp`
6. Store the R2 URLs in the `images` table.

### Expected Size Reduction

| Original (phone JPEG) | Full-size WebP | Thumbnail WebP |
|------------------------|----------------|----------------|
| 4–8 MB                 | 200–600 KB     | 30–80 KB       |

This means 10GB of original photos becomes roughly **1–2 GB** stored.

---

## 10. Security

- **Row-Level Security (RLS)** on Supabase:
  - `pins`: `SELECT` for everyone, `INSERT/UPDATE/DELETE` only for authenticated admin user.
  - `images`: same policy.
- **API route auth**: Admin endpoints check for a valid Supabase JWT in the `Authorization` header.
- **R2 access**: Images are served via public R2 URLs (or a Cloudflare Worker for access control if needed later). Since the map is public, public image URLs are fine.
- **EXIF stripping**: All uploaded images have EXIF data removed to prevent leaking GPS coordinates or device info.
- **File validation**: API route checks MIME type and file size before processing. Max file size: **20MB per image**.
- **Rate limiting**: Basic rate limiting on upload endpoints to prevent abuse (e.g., 20 uploads per minute).

---

## 11. Project Structure

```
wayprint/
├── app/
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Main map page (public)
│   ├── login/
│   │   └── page.tsx                # Login page
│   └── api/
│       ├── pins/
│       │   ├── route.ts            # GET (list), POST (create)
│       │   └── [id]/
│       │       ├── route.ts        # GET, PATCH, DELETE
│       │       └── images/
│       │           └── route.ts    # GET images for pin
│       └── images/
│           ├── route.ts            # POST (upload)
│           └── [id]/
│               └── route.ts        # PATCH, DELETE
├── components/
│   ├── map/
│   │   ├── MapView.tsx             # MapLibre GL JS map wrapper
│   │   ├── PinMarker.tsx           # Individual pin on the map
│   │   └── MapControls.tsx         # Zoom, locate, etc.
│   ├── burst/
│   │   ├── PhotoBurstDesktop.tsx   # Scatter burst (≥768px)
│   │   ├── PhotoCascadeMobile.tsx  # Vertical cascade (<768px)
│   │   ├── BurstPhoto.tsx          # Individual photo in burst/cascade
│   │   └── PhotoBurstSwitch.tsx    # Picks desktop or mobile layout based on viewport
│   ├── gallery/
│   │   └── PhotoLightbox.tsx       # Full-screen photo viewer
│   ├── admin/
│   │   ├── AdminSheet.tsx          # Unified bottom sheet (all admin controls)
│   │   ├── PinEditor.tsx           # Pin label + photo management (lives inside AdminSheet)
│   │   └── ImageUploader.tsx       # Drag-and-drop upload zone
│   └── ui/                         # shadcn/ui components
├── hooks/
│   └── useAdminSession.ts          # Supabase auth state hook (session + signOut)
├── lib/
│   ├── supabase.ts                 # Browser-safe anon client
│   ├── supabase-admin.ts           # Server-only service role client (API routes only)
│   ├── auth.ts                     # requireAdmin() JWT guard for API routes
│   ├── r2.ts                       # R2 upload/delete helpers
│   ├── image-processing.ts         # sharp resize/compress logic
│   └── burst-layout.ts             # Scatter position calculator (desktop) + cascade positions (mobile)
├── types/
│   └── index.ts                    # Pin, Image, etc. TypeScript types
├── public/
│   └── ...                         # Static assets
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## 12. Build Phases

### Phase 1 — Map + Static Pins

- Set up Next.js + TypeScript + Tailwind + shadcn/ui project.
- Integrate MapLibre GL JS with `@vis.gl/react-maplibre`, using OpenFreeMap tiles.
- Render the map centered on Japan with a handful of hardcoded pins.
- Click a pin to see a basic popup with the label.
- **Milestone**: Map renders with clickable pins.

### Phase 2 — Burst & Cascade Animations

- Build the `PhotoBurstDesktop` (scatter) and `PhotoCascadeMobile` (cascade) components.
- Build `PhotoBurstSwitch` to pick the right layout based on viewport width.
- Use hardcoded local images to prototype both layouts.
- Implement the scatter position algorithm (viewport-filling, overlap, exclusion zone around pin).
- Implement the cascade layout (vertical scroll, offset stacking, slide-in from side).
- Tune the Framer Motion spring physics until both feel right.
- Handle the collapse/close animations.
- Add the photo lightbox.
- **Milestone**: Clicking a pin triggers a delightful scatter burst (desktop) or cascade (mobile).

### Phase 3 — Backend + Persistence

- Set up Supabase project (database + auth).
- Create `pins` and `images` tables with RLS policies.
- Build API routes for CRUD operations.
- Replace hardcoded data with live data from Supabase.
- **Milestone**: Pins and image metadata persist across sessions.

### Phase 4 — Image Upload Pipeline

- Set up Cloudflare R2 bucket.
- Build the `sharp` processing pipeline in the upload API route.
- Build the `ImageUploader` component with drag-and-drop.
- Wire up the full flow: select pin → upload photos → see them in the burst.
- **Milestone**: Full upload-to-burst pipeline works end to end.

### Phase 5 — Admin UI + Auth

- Set up Supabase Auth with a single admin account (created manually in Supabase dashboard).
- Build the login page (`/login`).
- Build the `AdminSheet` (unified bottom sheet) with drag-to-resize behavior.
- Wire `PinEditor` into the sheet: label editing, photo grid with captions, delete.
- Add "click map to create pin" in edit mode (triggers sheet expansion).
- Protect admin API routes with JWT validation (`requireAdmin` helper).
- Split Supabase client into `supabase.ts` (anon, browser-safe) and `supabase-admin.ts` (service role, server-only).
- **Milestone**: Complete admin editing experience via the bottom sheet.

### Phase 6 — Polish + Deploy

- Responsive design pass for mobile.
- Map style customization (dark mode, custom colors).
- Loading states and skeleton UIs.
- Error handling and toast notifications.
- SEO meta tags and Open Graph image.
- Deploy to Vercel, connect custom domain if desired.
- **Milestone**: Production-ready, publicly accessible.

### Future Ideas (Optional)

- EXIF GPS auto-suggestion for pin placement.
- Cluster markers when zoomed out (combine nearby pins into a count bubble).
- Search/filter pins by label.
- Share link to a specific pin (URL hash or query param).
- Map style switcher (satellite, dark, light).
- PWA support for mobile home screen.
- Offline viewing with service worker caching.

---

## 13. Development Environment

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- No map account needed — OpenFreeMap requires no registration or API key
- Supabase account (free tier) for project URL + anon key
- Cloudflare account (free tier) for R2 bucket + API credentials

### Environment Variables

```env
# Map (OpenFreeMap — no API key needed)
NEXT_PUBLIC_MAP_STYLE=https://tiles.openfreemap.org/styles/liberty

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# Cloudflare R2
R2_ACCOUNT_ID=xxxxx
R2_ACCESS_KEY_ID=xxxxx
R2_SECRET_ACCESS_KEY=xxxxx
R2_BUCKET_NAME=wayprint
R2_PUBLIC_URL=https://xxxxx.r2.dev
```
