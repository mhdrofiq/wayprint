# Wayprint

A personal, location-based photo gallery set in Japan. Drop pins on a map, upload photos to each pin, and watch them burst outward in an animated explosion when clicked. The map is the organizing principle — a spatial photo diary.

**Live:** [wayprint.vercel.app](https://wayprint.vercel.app)

---

## Features

- **Burst animation** — clicking a pin scatters photos across the viewport with spring physics (desktop) or stacks them in a scrollable cascade (mobile)
- **Emoji reactions** — visitors can add emoji sticker reactions to any photo, placed on the image with randomised position and rotation
- **Collections** — photos within a pin can be grouped into named collections, filterable in the burst view
- **Lightbox** — full-resolution image viewer with keyboard navigation
- **Admin panel** — password-protected bottom sheet for adding pins, uploading photos, writing captions, managing collections, and removing reactions
- **Pre-fetch on hover** — images are silently fetched when hovering a pin, so the burst opens instantly on click

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Map | MapLibre GL JS via `@vis.gl/react-maplibre` |
| Map Tiles | OpenFreeMap (free, no API key) |
| Animation | Framer Motion |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (Postgres + Auth) |
| Image Storage | Cloudflare R2 |
| Image Processing | sharp (server-side WebP conversion) |
| Deployment | Vercel |

## Architecture

The map is publicly viewable with no login required. A single admin user (me) logs in via Supabase Auth to manage content. Images are processed server-side with sharp before being stored on Cloudflare R2 — the client never touches R2 directly.

```
Browser → Next.js API Routes (Vercel) → Supabase (Postgres + Auth)
                                       → Cloudflare R2 (images)
```

## Running Locally

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file with the following variables:
   ```
   NEXT_PUBLIC_MAP_STYLE=
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ADMIN_USER_ID=
   R2_ACCOUNT_ID=
   R2_ACCESS_KEY_ID=
   R2_SECRET_ACCESS_KEY=
   R2_BUCKET_NAME=
   R2_PUBLIC_URL=
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

This is a personal project and not designed for multi-user deployment, but the code is open to read.
