'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface OrderFilterValues {
  status?: string;
}

interface OrderFiltersProps {
  onFiltersChange: (filters: OrderFilterValues) => void;
  initialValues?: OrderFilterValues;
  className?: string;
}

const ORDER_STATUSES = [
  { label: 'All Statuses', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending Approval', value: 'pending_approval' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
] as const;

export function OrderFilters({
  onFiltersChange,
  initialValues = {},
  className,
}: OrderFiltersProps): React.ReactElement {
  const [selectedStatus, setSelectedStatus] = React.useState(initialValues.status ?? '');

  React.useEffect(() => {
    onFiltersChange({
      status: selectedStatus || undefined,
    });
  }, [selectedStatus, onFiltersChange]);

  function handleClearAll(): void {
    setSelectedStatus('');
    onFiltersChange({ status: undefined });
  }

  const hasActiveFilters = Boolean(selectedStatus);

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <Select
        value={selectedStatus}
        onChange={(e) => setSelectedStatus(e.target.value)}
        className="w-48"
        aria-label="Status"
      >
        {ORDER_STATUSES.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearAll}>
          Clear All
        </Button>
      )}
    </div>
  );
}
