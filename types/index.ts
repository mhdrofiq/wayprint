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

export interface Reaction {
  id: string;
  image_id: string;
  emoji: string;
  pos_x: number;
  pos_y: number;
  rotation: number;
  reactor_name: string;
  created_at: string;
}

export interface Image {
  id: string;
  pin_id: string;
  url: string;
  thumb_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
  collection_id: string | null;
  reactions?: Reaction[]; // populated by /api/pins/:id/images; absent on freshly uploaded images
}

export interface Collection {
  id: string;
  pin_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface ScreenPos {
  x: number;
  y: number;
}
