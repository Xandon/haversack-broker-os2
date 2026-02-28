'use client';

import * as React from 'react';
import { PageHeader } from '@/components/patterns/page-header';
import { DataTable } from '@/components/patterns/data-table';
import { ErrorState } from '@/components/patterns/error-state';
import { EmptyState } from '@/components/patterns/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { orderColumns } from '@/components/orders/order-columns';
import { useApprovalQueue } from '@/hooks/use-orders';
import { ClipboardCheck } from 'lucide-react';

function ApprovalQueueSkeleton(): React.ReactElement {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export default function ApprovalQueuePage(): React.ReactElement {
  const [cursorStack, setCursorStack] = React.useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = React.useState<string | undefined>();

  const { data, isLoading, isError, refetch } = useApprovalQueue({
    cursor: currentCursor,
  });

  const handleNextPage = React.useCallback(() => {
    if (data?.pagination.cursor) {
      setCursorStack((prev) => [...prev, currentCursor ?? '']);
      setCurrentCursor(data.pagination.cursor);
    }
  }, [data?.pagination.cursor, currentCursor]);

  const handlePreviousPage = React.useCallback(() => {
    setCursorStack((prev) => {
      const newStack = [...prev];
      const previousCursor = newStack.pop();
      setCurrentCursor(previousCursor || undefined);
      return newStack;
    });
  }, []);

  if (isError) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title="Approval Queue"
          breadcrumbs={[
            { label: 'Orders', href: '/orders' },
            { label: 'Approval Queue' },
          ]}
        />
        <ErrorState
          title="Failed to load approval queue"
          message="There was an error loading the approval queue. Please try again."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const total = data?.pagination.total ?? 0;
  const pageSize = 20;
  const pageNumber = cursorStack.length + 1;
  const rangeStart = total > 0 ? (pageNumber - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(pageNumber * pageSize, total);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Approval Queue"
        breadcrumbs={[
          { label: 'Orders', href: '/orders' },
          { label: 'Approval Queue' },
        ]}
      />

      {isLoading ? (
        <ApprovalQueueSkeleton />
      ) : data?.data.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="h-12 w-12" />}
          title="No orders pending approval"
          description="All orders have been reviewed. Check back later."
        />
      ) : (
        <>
          {total > 0 && (
            <p className="text-sm text-muted-foreground">
              {total} order{total !== 1 ? 's' : ''} pending approval
              {total > pageSize && ` (showing ${rangeStart}-${rangeEnd})`}
            </p>
          )}
          <DataTable
            columns={orderColumns}
            data={data?.data ?? []}
            pageSize={pageSize}
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
