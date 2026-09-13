'use client';

import { useSyncExternalStore } from 'react';

// Layout-viewport-based phone check (matches the burst/cascade breakpoint
// so this behavior tracks the same form-factor distinction).
const PHONE_QUERY = '(max-width: 767px), (max-height: 500px)';

// One shared MediaQueryList — getSnapshot runs on every render of every
// subscriber, so avoid re-parsing the query each time.
let mql: MediaQueryList | undefined;
const getMql = () => (mql ??= window.matchMedia(PHONE_QUERY));

function subscribe(onChange: () => void) {
  const m = getMql();
  m.addEventListener('change', onChange);
  return () => m.removeEventListener('change', onChange);
}
const getSnapshot = () => getMql().matches;
// SSR default — corrected on hydration.
const getServerSnapshot = () => false;

export function useIsPhone() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
