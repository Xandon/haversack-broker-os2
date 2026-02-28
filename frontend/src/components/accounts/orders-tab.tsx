'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/patterns/error-state';
import { EmptyState } from '@/components/patterns/empty-state';
import { StatusBadge } from '@/components/patterns/status-badge';
import { useAccountOrders } from '@/hooks/use-account-orders';

interface OrdersTabProps {
  accountId: string;
}

function OrderRow({ order }: { order: Record<string, unknown> }): React.ReactElement {
  const total = typeof order['total'] === 'number' ? order['total'] : 0;
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(total);

  const createdAt = order['createdAt']
    ? new Date(order['createdAt'] as string).toLocaleDateString()
    : '';

  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/50">
      <td className="px-4 py-3 text-sm">
        <Link
          href={`/orders/${order['id'] as string}`}
          className="font-medium text-primary hover:underline"
        >
          {order['orderNumber'] as string}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm">{createdAt}</td>
      <td className="px-4 py-3 text-sm">
        <StatusBadge status={order['status'] as string} />
      </td>
      <td className="px-4 py-3 text-sm text-right">{formattedTotal}</td>
      <td className="px-4 py-3 text-sm text-center">
        {order['lineItemCount'] as number}
      </td>
    </tr>
  );
}

function OrdersSkeleton(): React.ReactElement {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-8" />
        </div>
      ))}
    </div>
  );
}

export function OrdersTab({ accountId }: OrdersTabProps): React.ReactElement {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useAccountOrders(accountId, { limit: 10 });

  if (isLoading) {
    return <OrdersSkeleton />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load orders"
        message="There was an error loading the order history."
        onRetry={() => void refetch()}
      />
    );
  }

  const orders = data?.data ?? [];
  const total = data?.pagination.total ?? 0;

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        message="Create a new order for this account."
        actionLabel="New Order"
        onAction={() => router.push(`/orders/new?accountId=${accountId}`)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {orders.length} of {total} order{total !== 1 ? 's' : ''}
        </p>
        <Button
          size="sm"
          onClick={() => router.push(`/orders/new?accountId=${accountId}`)}
        >
          New Order
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left text-sm font-medium">Order #</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Date</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-2 text-right text-sm font-medium">Total</th>
              <th className="px-4 py-2 text-center text-sm font-medium">Items</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order as unknown as Record<string, unknown>}
              />
            ))}
          </tbody>
        </table>
      </div>

      {total > orders.length && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/orders?accountId=${accountId}`)}
          >
            View All Orders
          </Button>
        </div>
      )}
    </div>
  );
}
