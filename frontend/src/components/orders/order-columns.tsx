'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { StatusBadge } from '@/components/patterns/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { OrderListResponse } from '@haversack/shared';

export type OrderRow = OrderListResponse;

const ORDER_STATUS_VARIANT_MAP = {
  draft: 'secondary',
  pending_approval: 'warning',
  confirmed: 'success',
  rejected: 'destructive',
  cancelled: 'destructive',
} as const;

export const orderColumns: ColumnDef<OrderRow>[] = [
  {
    accessorKey: 'orderNumber',
    header: 'Order #',
    enableSorting: true,
    cell: ({ row }) => (
      <Link
        href={`/orders/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.orderNumber}
      </Link>
    ),
  },
  {
    accessorKey: 'accountName',
    header: 'Account',
    enableSorting: false,
    cell: ({ row }) => row.original.accountName,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: false,
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.status}
        variantMap={ORDER_STATUS_VARIANT_MAP}
      />
    ),
  },
  {
    accessorKey: 'total',
    header: 'Total',
    enableSorting: true,
    cell: ({ row }) => formatCurrency(row.original.total),
  },
  {
    accessorKey: 'lineItemCount',
    header: 'Items',
    enableSorting: false,
    cell: ({ row }) => row.original.lineItemCount,
  },
  {
    accessorKey: 'repName',
    header: 'Rep',
    enableSorting: false,
    cell: ({ row }) => row.original.repName,
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    enableSorting: true,
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];
