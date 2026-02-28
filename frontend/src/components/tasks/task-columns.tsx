'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { StatusBadge } from '@/components/patterns/status-badge';
import { TaskStatusToggle } from '@/components/tasks/task-status-toggle';
import type { TaskItem } from '@/hooks/use-tasks';

export type TaskRow = TaskItem;

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ');
}

function truncateText(text: string | null, maxLength: number = 80): string {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

export interface TaskColumnOptions {
  onStatusToggle?: (taskId: string, currentStatus: string) => void;
}

export function getTaskColumns(options?: TaskColumnOptions): ColumnDef<TaskRow>[] {
  const toggleColumn: ColumnDef<TaskRow> = {
    id: 'toggle',
    header: '',
    enableSorting: false,
    cell: ({ row }) => (
      <TaskStatusToggle
        status={row.original.status}
        onToggle={() =>
          options?.onStatusToggle?.(row.original.id, row.original.status)
        }
      />
    ),
  };

  return [
    ...(options?.onStatusToggle ? [toggleColumn] : []),
    ...taskColumns,
  ];
}

export const taskColumns: ColumnDef<TaskRow>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-medium">{row.original.title}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: false,
    cell: ({ row }) => <StatusBadge status={capitalizeFirst(row.original.status)} />,
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    enableSorting: false,
    cell: ({ row }) => <StatusBadge status={capitalizeFirst(row.original.priority)} />,
  },
  {
    accessorKey: 'dueDate',
    header: 'Due Date',
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-sm">{formatDate(row.original.dueDate)}</span>
    ),
  },
  {
    accessorKey: 'isOverdue',
    header: 'Overdue',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.isOverdue ? (
        <span className="text-sm font-medium text-destructive">Overdue</span>
      ) : null,
  },
  {
    accessorKey: 'description',
    header: 'Description',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {truncateText(row.original.description)}
      </span>
    ),
  },
];
