'use client';

import type { CommissionSummary } from '@/hooks/use-commissions';

interface CommissionSummaryCardProps {
  summary: CommissionSummary;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export function CommissionSummaryCard({ summary }: CommissionSummaryCardProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">Earned (MTD)</p>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalEarned)}</p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">Pending</p>
        <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary.totalPending)}</p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">Approved</p>
        <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalApproved)}</p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">Year-to-Date</p>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.ytdTotal)}</p>
      </div>
    </div>
  );
}
