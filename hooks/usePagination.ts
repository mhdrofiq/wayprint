'use client';

import { useMemo, useState } from 'react';
import { PAGE_SIZE } from '@/lib/burst-layout';

/** Splits `items` into PAGE_SIZE pages and tracks the current one. */
export function usePagination<T>(items: T[]) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const pageItems = useMemo(
    () => items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [items, page],
  );
  return { page, setPage, totalPages, pageItems };
}
