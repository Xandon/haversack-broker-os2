'use client';

import * as React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { type SortingState } from '@tanstack/react-table';
import { PageHeader } from '@/components/patterns/page-header';
import { DataTable } from '@/components/patterns/data-table';
import { ErrorState } from '@/components/patterns/error-state';
import { Button } from '@/components/ui/button';
import { orderColumns } from '@/components/orders/order-columns';
import { OrderFilters, type OrderFilterValues } from '@/components/orders/order-filters';
import { OrderEmptyState } from '@/components/orders/order-empty-state';
import { useOrders, type UseOrdersParams } from '@/hooks/use-orders';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Skeleton } from '@/components/ui/skeleton';

function OrderListSkeleton(): React.ReactElement {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

function parseSearchParams(searchParams: URLSearchParams): UseOrdersParams {
  return {
    accountId: searchParams.get('accountId') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    sortBy: searchParams.get('sortBy') ?? 'createdAt',
    sortOrder: searchParams.get('sortOrder') ?? 'desc',
    cursor: searchParams.get('cursor') ?? undefined,
  };
}

export default function OrderListPage(): React.ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const params = parseSearchParams(searchParams);

  const [cursorStack, setCursorStack] = React.useState<string[]>([]);
  const pageNumber = cursorStack.length + 1;

  const isTablet = useMediaQuery('(max-width: 768px)');
  const isMobile = useMediaQuery('(max-width: 640px)');

  const columnVisibility = React.useMemo(() => ({
    repName: !isTablet,
    createdAt: !isTablet,
    lineItemCount: !isMobile,
  }), [isTablet, isMobile]);

  const { data, isLoading, isError, refetch } = useOrders(params);

  const sorting: SortingState = params.sortBy
    ? [{ id: params.sortBy, desc: params.sortOrder === 'desc' }]
    : [];

  const updateUrl = React.useCallback(
    (updates: Record<string, string | undefined>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === '') {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      }
      const qs = newParams.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`);
    },
    [searchParams, router, pathname],
  );

  const handleFiltersChange = React.useCallback(
    (filters: OrderFilterValues) => {
      setCursorStack([]);
      updateUrl({
        status: filters.status,
        cursor: undefined,
      });
    },
    [updateUrl],
  );

  const handleSortingChange = React.useCallback(
    (updater: SortingState | ((prev: SortingState) => SortingState)) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      const firstSort = newSorting[0];
      if (firstSort) {
        updateUrl({
          sortBy: firstSort.id,
          sortOrder: firstSort.desc ? 'desc' : 'asc',
          cursor: undefined,
        });
        setCursorStack([]);
      }
    },
    [sorting, updateUrl],
  );

  const handleNextPage = React.useCallback(() => {
    if (data?.pagination.cursor) {
      const currentCursor = params.cursor ?? '';
      setCursorStack((prev) => [...prev, currentCursor]);
      updateUrl({ cursor: data.pagination.cursor });
    }
  }, [data?.pagination.cursor, params.cursor, updateUrl]);

  const handlePreviousPage = React.useCallback(() => {
    setCursorStack((prev) => {
      const newStack = [...prev];
      const previousCursor = newStack.pop();
      updateUrl({ cursor: previousCursor || undefined });
      return newStack;
    });
  }, [updateUrl]);

  const hasActiveFilters = Boolean(params.status);

  if (isError) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Orders" />
        <ErrorState
          title="Failed to load orders"
          message="There was an error loading the order list. Please try again."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const total = data?.pagination.total ?? 0;
  const pageSize = 20;
  const rangeStart = total > 0 ? (pageNumber - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(pageNumber * pageSize, total);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Orders"
        actions={
          <Button
            className="min-h-[44px]"
            onClick={() => router.push('/orders/new')}
          >
            Create Order
          </Button>
        }
      />

      <OrderFilters
        onFiltersChange={handleFiltersChange}
        initialValues={{ status: params.status }}
      />

      {isLoading ? (
        <OrderListSkeleton />
      ) : data?.data.length === 0 ? (
        <OrderEmptyState
          isFiltered={hasActiveFilters}
          onClearFilters={() => handleFiltersChange({ status: undefined })}
        />
      ) : (
        <>
          {total > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing {rangeStart}-{rangeEnd} of {total}
            </p>
          )}
          <DataTable
            columns={orderColumns}
            data={data?.data ?? []}
            pageSize={pageSize}
            sorting={sorting}
            onSortingChange={handleSortingChange}
            manualSorting
            columnVisibility={columnVisibility}
            onNextPage={data?.pagination.hasMore ? handleNextPage : undefined}
            onPreviousPage={cursorStack.length > 0 ? handlePreviousPage : undefined}
            hasNextPage={data?.pagination.hasMore ?? false}
            hasPreviousPage={cursorStack.length > 0}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  );
}
