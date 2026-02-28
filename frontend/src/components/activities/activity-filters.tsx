'use client';

import * as React from 'react';
import { Select } from '@/components/ui/select';

export interface ActivityFilters {
  type?: string;
}

interface ActivityFilterBarProps {
  filters: ActivityFilters;
  onFilterChange: (filters: ActivityFilters) => void;
}

const ACTIVITY_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'visit', label: 'Visit' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'demo', label: 'Demo' },
  { value: 'sampling', label: 'Sampling' },
];

function ActivityFilterBar({ filters, onFilterChange }: ActivityFilterBarProps): React.ReactElement {
  return (
    <div className="flex items-center gap-3">
      <Select
        value={filters.type ?? ''}
        onChange={(e) =>
          onFilterChange({ ...filters, type: e.target.value || undefined })
        }
        className="w-36"
        aria-label="Filter by activity type"
      >
        {ACTIVITY_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

export { ActivityFilterBar };
