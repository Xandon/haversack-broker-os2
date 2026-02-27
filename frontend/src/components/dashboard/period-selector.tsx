'use client';

import { Select } from '@/components/ui/select';

type DashboardPeriod = 'current_month' | 'last_month' | 'current_quarter' | 'ytd' | 'trailing_12_months';

interface PeriodSelectorProps {
  value: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
}

const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: 'current_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'current_quarter', label: 'This Quarter' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'trailing_12_months', label: 'Trailing 12 Months' },
];

export function PeriodSelector({ value, onChange }: PeriodSelectorProps): React.ReactElement {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value as DashboardPeriod)}
      className="w-48"
      aria-label="Select dashboard period"
    >
      {PERIOD_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </Select>
  );
}
