'use client';

import type { ReportEntityType } from '@haversack/shared';

interface EntityPickerProps {
  value?: ReportEntityType;
  onChange: (entityType: ReportEntityType) => void;
}

const ENTITY_OPTIONS: { value: ReportEntityType; label: string; description: string }[] = [
  { value: 'account', label: 'Accounts', description: 'Customer accounts and store data' },
  { value: 'order', label: 'Orders', description: 'Sales orders and transactions' },
  { value: 'product', label: 'Products', description: 'Product catalog and inventory' },
  { value: 'commission', label: 'Commissions', description: 'Commission records and statements' },
  { value: 'activity', label: 'Activities', description: 'Sales activities and touchpoints' },
];

export function EntityPicker({ value, onChange }: EntityPickerProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">Entity Type</label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {ENTITY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              value === option.value
                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-sm font-medium text-gray-900">{option.label}</div>
            <div className="mt-0.5 text-xs text-gray-500">{option.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
