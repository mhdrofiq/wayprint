const LS_KEY = 'wayprint_reactions';
const KEY_LS_KEY = 'wayprint_reactor_key';

export function loadOwnedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function saveOwnedIds(ids: Set<string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
  } catch { /* ignore */ }
}

// Fallback when localStorage is unavailable: reactions stay removable for this page load.
let memoryKey: string | undefined;

/** This browser's secret reactor key. Sent when reacting and when removing a
 *  reaction, so only the browser that added a reaction can remove it. */
export function getReactorKey(): string {
  try {
    let key = localStorage.getItem(KEY_LS_KEY);
    if (!key) {
      key = crypto.randomUUID();
      localStorage.setItem(KEY_LS_KEY, key);
    }
    return key;
  } catch {
    return (memoryKey ??= crypto.randomUUID());
  }
}
