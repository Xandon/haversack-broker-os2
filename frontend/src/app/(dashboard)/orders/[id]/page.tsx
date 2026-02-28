'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { Skeleton, SkeletonTable } from '@/components/shared/skeleton';
import { useOrder } from '@/hooks/use-orders';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params['id'] as string;
  const { data, isLoading, error } = useOrder(orderId);

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorBanner message="Order not found" />
        <Link href="/orders" className="text-sm text-blue-600 hover:underline">
          Back to orders
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <SkeletonTable rows={4} />
      </div>
    );
  }

  const order = data?.data;
  if (!order) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order {order.orderNumber}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
            <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {order.status}
            </span>
            <span>{order.account?.name}</span>
            <span>${order.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Line Items</h2>
        </div>
        {!order.lineItems || order.lineItems.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No line items" description="This order has no line items" />
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Qty
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Unit Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {order.lineItems.map((li) => (
                <tr key={li.id}>
                  <td className="px-4 py-3 text-sm">{li.product?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{li.product?.sku ?? '—'}</td>
                  <td className="px-4 py-3 text-sm">{li.quantity}</td>
                  <td className="px-4 py-3 text-sm">${li.unitPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-medium">${li.lineTotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
