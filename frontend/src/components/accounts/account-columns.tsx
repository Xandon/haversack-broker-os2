'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { HealthScoreBadge } from './health-score-badge';
import type { AccountListItem } from '@/hooks/use-accounts';

export type AccountRow = AccountListItem;

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const accountColumns: ColumnDef<AccountRow>[] = [
  {
    accessorKey: 'name',
    header: 'Account Name',
    enableSorting: true,
    cell: ({ row }) => (
      <Link
        href={`/accounts/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: 'territory',
    header: 'Territory',
    enableSorting: false,
    cell: ({ row }) => row.original.territory?.name ?? '—',
  },
  {
    accessorKey: 'accountType',
    header: 'Type',
    enableSorting: false,
    cell: ({ row }) => capitalizeFirst(row.original.accountType),
  },
  {
    accessorKey: 'healthScore',
    header: 'Health',
    enableSorting: true,
    cell: ({ row }) => <HealthScoreBadge score={row.original.healthScore} />,
  },
  {
    accessorKey: 'updatedAt',
    header: 'Updated',
    enableSorting: true,
    cell: ({ row }) => formatDate(row.original.updatedAt),
  },
];
