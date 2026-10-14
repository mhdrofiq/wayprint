// Server-side caches for the public queries the pages render with, so a page
// render doesn't wait on the database more than once a minute. Matches the
// 60s CDN cache on the matching API routes.

import { unstable_cache } from 'next/cache';
import { fetchBurst, fetchPins } from '@/lib/queries';

const REVALIDATE = 60;

export const getCachedPins = unstable_cache(fetchPins, ['pins'], { revalidate: REVALIDATE });

export const getCachedBurst = unstable_cache(fetchBurst, ['burst'], { revalidate: REVALIDATE });
