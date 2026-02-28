'use client';

interface KpiCardProps {
  label: string;
  value: string;
  subValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

const VARIANT_STYLES: Record<string, string> = {
  default: 'text-gray-900',
  success: 'text-green-600',
  warning: 'text-amber-600',
  danger: 'text-red-600',
};

export function KpiCard({ label, value, subValue, variant = 'default', onClick }: KpiCardProps) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-4 ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${VARIANT_STYLES[variant]}`}>{value}</p>
      {subValue && <p className="mt-0.5 text-xs text-gray-400">{subValue}</p>}
    </div>
  );
}
