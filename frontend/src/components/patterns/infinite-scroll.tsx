'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InfiniteScrollProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading?: boolean;
  threshold?: number;
  className?: string;
  children: React.ReactNode;
}

function InfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading = false,
  threshold = 200,
  className,
  children,
}: InfiniteScrollProps): React.ReactElement {
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: `${threshold}px` },
    );

    observer.observe(sentinel);
    return (): void => {
      observer.disconnect();
    };
  }, [onLoadMore, hasMore, isLoading, threshold]);

  return (
    <div className={cn(className)}>
      {children}
      <div ref={sentinelRef} className="h-px" />
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {!hasMore && !isLoading && (
        <p className="py-4 text-center text-small text-muted-foreground">No more results</p>
      )}
    </div>
  );
}

export { InfiniteScroll };
