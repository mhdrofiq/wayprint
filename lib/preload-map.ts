import { preconnect, preload } from 'react-dom';

const MAP_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE;

/** Call from a page that renders MapView: starts fetching the map style
 *  alongside the HTML instead of after MapLibre boots. */
export function preloadMapStyle() {
  if (!MAP_STYLE) return;
  // MapLibre fetches the style (and usually its tiles) from this origin.
  preconnect(new URL(MAP_STYLE).origin, { crossOrigin: 'anonymous' });
  preload(MAP_STYLE, { as: 'fetch', crossOrigin: 'anonymous' });
}
