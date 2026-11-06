// Theme settings shared by the server (root layout) and the client (lib/theme.ts).

export type Theme = 'light' | 'dark';

/** localStorage key holding the visitor's explicit choice. Absent = follow the OS. */
export const THEME_STORAGE_KEY = 'wayprint_theme';

// OpenFreeMap: free, open-source vector tiles and styles, no key needed.
// Positron is the light greyscale style, Dark its dark counterpart.
export const MAP_STYLES: Record<Theme, string> = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

export const MAP_ORIGIN = 'https://tiles.openfreemap.org';

/** Runs in <head> before first paint: picks the theme (stored choice, else the
 *  OS setting), applies it, and starts downloading that theme's map style. */
export const themeScript = `(function(){try{
var t=null;try{t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}
if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}
var d=document.documentElement;if(t==='dark'){d.classList.add('dark')}d.style.colorScheme=t;
var l=document.createElement('link');l.rel='preload';l.as='fetch';l.crossOrigin='anonymous';l.href=${JSON.stringify(MAP_STYLES)}[t];document.head.appendChild(l);
}catch(e){}})();`;
