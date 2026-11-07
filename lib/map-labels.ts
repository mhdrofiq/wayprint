import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import type { Theme } from '@/lib/theme-config';
import labelLayersJson from './map-label-layers.json';

// The text layers of OpenFreeMap's Liberty style (MIT, a fork of OSM Liberty):
// place, street, water, transit and point-of-interest labels and road shields.
// Positron drops the points of interest and Dark has only a few dim labels, so
// both get Liberty's labels instead, recoloured for the theme. All three styles
// share the same tiles, sprite and fonts, so the layers work as they are.
// Snapshot of styles/liberty/style.json from hyperknot/openfreemap-styles,
// minus the one-way arrows (each base style keeps its own).
const labelLayers = labelLayersJson as LayerSpecification[];

type Role = 'place' | 'minorPlace' | 'water' | 'road' | 'poi' | 'transit' | 'shield';

function roleOf(id: string): Role {
  if (id.includes('shield')) return 'shield';
  if (id.startsWith('water')) return 'water';
  if (id.startsWith('highway-name')) return 'road';
  if (id === 'poi_transit' || id === 'airport') return 'transit';
  if (id.startsWith('poi')) return 'poi';
  if (id === 'label_other' || id === 'label_state') return 'minorPlace';
  return 'place';
}

const TEXT: Record<Theme, Record<Exclude<Role, 'shield'>, string>> = {
  light: {
    place: '#111111',
    minorPlace: '#444444',
    water: '#46627e',
    road: '#555555',
    poi: '#555555',
    transit: '#2e5a80',
  },
  dark: {
    place: '#e6e6e6',
    minorPlace: '#a8a8a8',
    water: '#7d98ad',
    road: '#9a9a9a',
    poi: '#a0a0a0',
    transit: '#8fb3d9',
  },
};

const HALO: Record<Theme, string> = { light: '#ffffff', dark: '#0a0a0a' };

/** Swaps sprite names inside an icon-image value (a string or expression). */
function swapIcon(value: unknown, from: string, to: string): unknown {
  if (value === from) return to;
  if (Array.isArray(value)) return value.map((v) => swapIcon(v, from, to));
  return value;
}

function themedLayer(layer: LayerSpecification, theme: Theme): LayerSpecification {
  if (layer.type !== 'symbol') return layer;
  const role = roleOf(layer.id);
  if (role === 'shield') return layer;

  const layout = { ...layer.layout };
  // The black place dots disappear on the dark map; use the light ones.
  if (theme === 'dark' && layout['icon-image'] !== undefined) {
    layout['icon-image'] = swapIcon(layout['icon-image'], 'circle_11_black', 'circle_11') as typeof layout['icon-image'];
  }

  return {
    ...layer,
    layout,
    paint: {
      ...layer.paint,
      'text-color': TEXT[theme][role],
      'text-halo-color': HALO[theme],
      'text-halo-width': 1.2,
      'text-halo-blur': 0.5,
    },
  };
}

/** The base style with its own labels replaced by Liberty's, themed. */
export function withLabels(base: StyleSpecification, theme: Theme): StyleSpecification {
  const kept = base.layers.filter(
    (l) => l.type !== 'symbol' || l.id.includes('oneway') || l.id.includes('one_way'),
  );
  return {
    ...base,
    layers: [...kept, ...labelLayers.map((l) => themedLayer(l, theme))],
  };
}
