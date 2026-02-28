'use client';

import * as React from 'react';
import { Select } from '@/components/ui/select';

export interface TaskFilters {
  status?: string;
  priority?: string;
  overdue?: string;
}

interface TaskFilterBarProps {
  filters: TaskFilters;
  onFilterChange: (filters: TaskFilters) => void;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const OVERDUE_OPTIONS = [
  { value: '', label: 'All Tasks' },
  { value: 'true', label: 'Overdue Only' },
  { value: 'false', label: 'Not Overdue' },
];

function TaskFilterBar({ filters, onFilterChange }: TaskFilterBarProps): React.ReactElement {
  return (
    <div className="flex items-center gap-3">
      <Select
        value={filters.status ?? ''}
        onChange={(e) =>
          onFilterChange({ ...filters, status: e.target.value || undefined })
        }
        className="w-36"
        aria-label="Filter by status"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>

      <Select
        value={filters.priority ?? ''}
        onChange={(e) =>
          onFilterChange({ ...filters, priority: e.target.value || undefined })
        }
        className="w-36"
        aria-label="Filter by priority"
      >
        {PRIORITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>

      <Select
        value={filters.overdue ?? ''}
        onChange={(e) =>
          onFilterChange({ ...filters, overdue: e.target.value || undefined })
        }
        className="w-36"
        aria-label="Filter by overdue"
      >
        {OVERDUE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

export { TaskFilterBar };
