'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

export interface FilterConfig {
  id: string;
  label: string;
  options: { label: string; value: string }[];
}

export interface FilterValues {
  [filterId: string]: string | undefined;
}

export interface FilterBarProps {
  filters: FilterConfig[];
  values: FilterValues;
  onFilterChange: (filterId: string, value: string | undefined) => void;
  onClearAll: () => void;
  className?: string;
}

function FilterBar({ filters, values, onFilterChange, onClearAll, className }: FilterBarProps): React.ReactElement {
  const hasActiveFilters = Object.values(values).some((v) => v !== undefined);

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {filters.map((filter) => (
        <Select
          key={filter.id}
          value={values[filter.id] ?? ''}
          onChange={(e) => onFilterChange(filter.id, e.target.value || undefined)}
          className="w-[160px]"
        >
          <option value="">{filter.label}</option>
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      ))}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearAll} className="h-9">
          <X className="mr-1 h-4 w-4" />
          Clear all
        </Button>
      )}
    </div>
  );
}

export { FilterBar };
