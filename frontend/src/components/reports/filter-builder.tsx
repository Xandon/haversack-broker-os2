'use client';

import type { ReportFilter } from '@haversack/shared';

interface ColumnOption {
  key: string;
  label: string;
}

interface FilterBuilderProps {
  columns: ColumnOption[];
  filters: ReportFilter[];
  onChange: (filters: ReportFilter[]) => void;
}

const OPERATORS = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'gt', label: 'greater than' },
  { value: 'gte', label: 'greater or equal' },
  { value: 'lt', label: 'less than' },
  { value: 'lte', label: 'less or equal' },
  { value: 'contains', label: 'contains' },
] as const;

export function FilterBuilder({ columns, filters, onChange }: FilterBuilderProps) {
  const addFilter = () => {
    const firstCol = columns[0];
    if (!firstCol) return;
    onChange([...filters, { field: firstCol.key, operator: 'eq', value: '' }]);
  };

  const updateFilter = (index: number, update: Partial<ReportFilter>) => {
    const updated = filters.map((f, i) => (i === index ? { ...f, ...update } : f));
    onChange(updated);
  };

  const removeFilter = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Filters</label>
        <button
          type="button"
          onClick={addFilter}
          className="text-xs text-blue-600 hover:text-blue-800"
          disabled={columns.length === 0}
        >
          + Add Filter
        </button>
      </div>
      {filters.length === 0 && <p className="text-xs text-gray-400">No filters applied</p>}
      <div className="space-y-2">
        {filters.map((filter, index) => (
          <div key={index} className="flex items-center gap-2">
            <select
              value={filter.field}
              onChange={(e) => updateFilter(index, { field: e.target.value })}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              aria-label="Filter field"
            >
              {columns.map((col) => (
                <option key={col.key} value={col.key}>
                  {col.label}
                </option>
              ))}
            </select>
            <select
              value={filter.operator}
              onChange={(e) =>
                updateFilter(index, {
                  operator: e.target.value as ReportFilter['operator'],
                })
              }
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              aria-label="Filter operator"
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={String(filter.value)}
              onChange={(e) => updateFilter(index, { value: e.target.value })}
              placeholder="Value"
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
              aria-label="Filter value"
            />
            <button
              type="button"
              onClick={() => removeFilter(index)}
              className="text-sm text-red-500 hover:text-red-700"
              aria-label="Remove filter"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
