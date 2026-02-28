'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { StatusBadge } from '@/components/patterns/status-badge';
import type { ActivityItem } from '@/hooks/use-activities';

export type ActivityRow = ActivityItem;

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function truncateNotes(notes: string | null, maxLength: number = 80): string {
  if (!notes) return '—';
  return notes.length > maxLength ? `${notes.slice(0, maxLength)}…` : notes;
}

export const activityColumns: ColumnDef<ActivityRow>[] = [
  {
    accessorKey: 'type',
    header: 'Type',
    enableSorting: false,
    cell: ({ row }) => <StatusBadge status={capitalizeFirst(row.original.type)} />,
  },
  {
    accessorKey: 'occurredAt',
    header: 'Date',
    enableSorting: true,
    cell: ({ row }) => (
      <div>
        <div className="text-sm">{formatDate(row.original.occurredAt)}</div>
        <div className="text-xs text-muted-foreground">{formatTime(row.original.occurredAt)}</div>
      </div>
    ),
  },
  {
    accessorKey: 'notes',
    header: 'Notes',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{truncateNotes(row.original.notes)}</span>
    ),
  },
  {
    accessorKey: 'durationMinutes',
    header: 'Duration',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.durationMinutes ? `${row.original.durationMinutes} min` : '—',
  },
  {
    accessorKey: 'demos',
    header: 'Demos',
    enableSorting: false,
    cell: ({ row }) => {
      const count = row.original.demos.length;
      return count > 0 ? `${count} product${count !== 1 ? 's' : ''}` : '—';
    },
  },
];
