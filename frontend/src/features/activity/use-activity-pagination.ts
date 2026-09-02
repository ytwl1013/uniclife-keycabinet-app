import { useCallback, useMemo, useState } from 'react';

export const ACTIVITY_PAGE_SIZE = 20;

type PaginationState = {
  count: number;
  resetKey: string;
};

export function useActivityPagination<Entry>(entries: Entry[], resetKey: string) {
  const [pagination, setPagination] = useState<PaginationState>({
    count: ACTIVITY_PAGE_SIZE,
    resetKey,
  });
  const visibleCount = pagination.resetKey === resetKey
    ? pagination.count
    : ACTIVITY_PAGE_SIZE;
  const visibleEntries = useMemo(
    () => entries.slice(0, visibleCount),
    [entries, visibleCount],
  );
  const hasMore = visibleEntries.length < entries.length;
  const loadMore = useCallback(() => {
    setPagination((current) => {
      const currentCount = current.resetKey === resetKey
        ? current.count
        : ACTIVITY_PAGE_SIZE;
      return {
        count: Math.min(currentCount + ACTIVITY_PAGE_SIZE, entries.length),
        resetKey,
      };
    });
  }, [entries.length, resetKey]);

  return { hasMore, loadMore, visibleEntries };
}
