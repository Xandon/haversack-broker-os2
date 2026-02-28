'use client';

import * as React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { type SortingState } from '@tanstack/react-table';
import { PageHeader } from '@/components/patterns/page-header';
import { DataTable } from '@/components/patterns/data-table';
import { ErrorState } from '@/components/patterns/error-state';
import { Button } from '@/components/ui/button';
import { accountColumns } from '@/components/accounts/account-columns';
import { AccountFilters, type AccountFilterValues } from '@/components/accounts/account-filters';
import { AccountEmptyState } from '@/components/accounts/account-empty-state';
import { useAccounts, type UseAccountsParams } from '@/hooks/use-accounts';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Skeleton } from '@/components/ui/skeleton';

function AccountListSkeleton(): React.ReactElement {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

function parseSearchParams(searchParams: URLSearchParams): UseAccountsParams {
  return {
    territoryId: searchParams.get('territoryId') ?? undefined,
    accountType: searchParams.get('accountType') ?? undefined,
    healthScoreMin: searchParams.has('healthScoreMin') ? Number(searchParams.get('healthScoreMin')) : undefined,
    healthScoreMax: searchParams.has('healthScoreMax') ? Number(searchParams.get('healthScoreMax')) : undefined,
    search: searchParams.get('search') ?? undefined,
    sortBy: searchParams.get('sortBy') ?? 'updatedAt',
    sortOrder: searchParams.get('sortOrder') ?? 'desc',
    cursor: searchParams.get('cursor') ?? undefined,
  };
}

export default function AccountListPage(): React.ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse initial params from URL
  const params = parseSearchParams(searchParams);

  // Cursor history for Previous button
  const [cursorStack, setCursorStack] = React.useState<string[]>([]);

  // Track page number for display
  const pageNumber = cursorStack.length + 1;

  // Responsive column visibility
  const isTablet = useMediaQuery('(max-width: 768px)');
  const isMobile = useMediaQuery('(max-width: 640px)');

  const columnVisibility = React.useMemo(() => ({
    updatedAt: !isTablet,
    territory: !isMobile,
  }), [isTablet, isMobile]);

  // Fetch accounts
  const { data, isLoading, isError, refetch } = useAccounts(params);

  // Sorting state synced to URL
  const sorting: SortingState = params.sortBy
    ? [{ id: params.sortBy, desc: params.sortOrder === 'desc' }]
    : [];

  // Update URL with new params
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

  // Filter change handler
  const handleFiltersChange = React.useCallback(
    (filters: AccountFilterValues) => {
      setCursorStack([]);
      updateUrl({
        territoryId: filters.territoryId,
        accountType: filters.accountType,
        healthScoreMin: filters.healthScoreMin !== undefined ? String(filters.healthScoreMin) : undefined,
        healthScoreMax: filters.healthScoreMax !== undefined ? String(filters.healthScoreMax) : undefined,
        search: filters.search,
        cursor: undefined, // Reset pagination on filter change
      });
    },
    [updateUrl],
  );

  // Sort change handler
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

  // Pagination handlers
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

  // Check if any filters are active
  const hasActiveFilters = Boolean(
    params.territoryId || params.accountType || params.healthScoreMin !== undefined || params.search,
  );

  // Error state
  if (isError) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Accounts" />
        <ErrorState
          title="Failed to load accounts"
          message="There was an error loading the account list. Please try again."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  // Compute display range
  const total = data?.pagination.total ?? 0;
  const pageSize = 20;
  const rangeStart = total > 0 ? (pageNumber - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(pageNumber * pageSize, total);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Accounts"
        actions={
          <Button onClick={() => router.push('/accounts/new')}>
            Create Account
          </Button>
        }
      />

      <AccountFilters
        onFiltersChange={handleFiltersChange}
        initialValues={{
          territoryId: params.territoryId,
          accountType: params.accountType,
          healthScoreMin: params.healthScoreMin,
          healthScoreMax: params.healthScoreMax,
          search: params.search,
        }}
      />

      {isLoading ? (
        <AccountListSkeleton />
      ) : data?.data.length === 0 ? (
        <AccountEmptyState
          isFiltered={hasActiveFilters}
          onClearFilters={() =>
            handleFiltersChange({
              territoryId: undefined,
              accountType: undefined,
              healthScoreMin: undefined,
              healthScoreMax: undefined,
              search: undefined,
            })
          }
        />
      ) : (
        <>
          {total > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing {rangeStart}-{rangeEnd} of {total}
            </p>
          )}
          <DataTable
            columns={accountColumns}
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
