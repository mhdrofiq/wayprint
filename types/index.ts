export interface Pin {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export interface Image {
  id: string;
  pin_id: string;
  url: string;
  thumb_url: string;
  caption: string | null;
  sort_order: number;
}

export interface ScreenPos {
  x: number;
  y: number;
}
