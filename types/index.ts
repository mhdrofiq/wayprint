export interface Pin {
  id: string;
  label: string;
  lat: number;
  lng: number;
  created_at: string;
  updated_at: string;
  /** Returned by GET /api/pins (list). Not present on single-pin GET. */
  image_count?: number;
}

export interface Image {
  id: string;
  pin_id: string;
  url: string;
  thumb_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export interface ScreenPos {
  x: number;
  y: number;
}
