import { useRef, useEffect, useCallback, type RefObject } from 'react';

export interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  threshold?: number;
  rootRef?: RefObject<HTMLElement>;
}

export interface UseInfiniteScrollReturn {
  sentinelRef: RefObject<HTMLDivElement>;
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  threshold = 200,
  rootRef,
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const stableOnLoadMore = useCallback(onLoadMore, [onLoadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          stableOnLoadMore();
        }
      },
      {
        root: rootRef?.current ?? null,
        rootMargin: `${threshold}px`,
      },
    );

    observer.observe(sentinel);
    return (): void => {
      observer.disconnect();
    };
  }, [hasMore, threshold, rootRef, stableOnLoadMore]);

  return { sentinelRef };
}
