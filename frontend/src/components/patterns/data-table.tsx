'use client';

import * as React from 'react';
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageSize?: number;
  onNextPage?: () => void;
  onPreviousPage?: () => void;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  isLoading?: boolean;
  sorting?: SortingState;
  onSortingChange?: (updater: SortingState | ((prev: SortingState) => SortingState)) => void;
  manualSorting?: boolean;
  columnVisibility?: VisibilityState;
  className?: string;
}

function DataTable<TData, TValue>({
  columns,
  data,
  pageSize = 20,
  onNextPage,
  onPreviousPage,
  hasNextPage = false,
  hasPreviousPage = false,
  isLoading = false,
  sorting: externalSorting,
  onSortingChange: externalOnSortingChange,
  manualSorting = false,
  columnVisibility: externalColumnVisibility,
  className,
}: DataTableProps<TData, TValue>): React.ReactElement {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [internalColumnVisibility, setInternalColumnVisibility] = React.useState<VisibilityState>({});

  const sorting = externalSorting ?? internalSorting;
  const columnVisibility = externalColumnVisibility ?? internalColumnVisibility;

  const table = useReactTable({
    data,
    columns,
    pageCount: -1,
    state: {
      sorting,
      columnVisibility,
      pagination: { pageIndex: 0, pageSize },
    },
    onSortingChange: externalOnSortingChange ?? setInternalSorting,
    onColumnVisibilityChange: setInternalColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    manualSorting,
    manualPagination: true,
  });

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {isLoading ? 'Loading...' : 'No results.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {(onNextPage || onPreviousPage) && (
        <div className="flex items-center justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={onPreviousPage} disabled={!hasPreviousPage || isLoading}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={onNextPage} disabled={!hasNextPage || isLoading}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export { DataTable };
