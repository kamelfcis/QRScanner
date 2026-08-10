'use client';

import { useMemo, useState } from 'react';

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export function usePagination<T>(items: T[] | undefined, resetKey = '') {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState<PageSizeOption>(DEFAULT_PAGE_SIZE);
  const [storedResetKey, setStoredResetKey] = useState(resetKey);

  if (storedResetKey !== resetKey) {
    setStoredResetKey(resetKey);
    setPage(1);
  }

  const totalItems = items?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    if (!items?.length) return [];
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);

  const setPageSize = (size: PageSizeOption) => {
    setPageSizeState(size);
    setPage(1);
  };

  return {
    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    paginatedItems,
    rangeStart,
    rangeEnd,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  };
}
