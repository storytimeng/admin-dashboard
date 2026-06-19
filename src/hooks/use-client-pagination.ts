"use client";

import { useEffect, useMemo, useState } from "react";

export const DEFAULT_TABLE_PAGE_SIZE = 20;

export function useClientPagination<T>(
  items: T[],
  options?: {
    defaultPageSize?: number;
    resetKeys?: unknown[];
  },
) {
  const defaultPageSize = options?.defaultPageSize ?? DEFAULT_TABLE_PAGE_SIZE;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  const resetKey = JSON.stringify(options?.resetKeys ?? []);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const serialOffset = (page - 1) * pageSize;

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return {
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    paginatedItems,
    serialOffset,
    handlePageSizeChange,
  };
}
