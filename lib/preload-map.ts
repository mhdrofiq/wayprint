import { preconnect } from 'react-dom';
import { MAP_ORIGIN } from '@/lib/theme-config';

/** Call from a page that renders MapView: opens the connection to the map
 *  tile server alongside the HTML. The style itself depends on the theme, so
 *  the inline theme script in the root layout preloads it. */
export function preloadMapStyle() {
  preconnect(MAP_ORIGIN, { crossOrigin: 'anonymous' });
}
