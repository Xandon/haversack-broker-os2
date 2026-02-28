'use client';

import type { DataQualityMetric } from '@/hooks/use-data-quality';

interface ScorecardMetricProps {
  metric: DataQualityMetric;
  onClick?: (metricKey: string) => void;
}

function getColor(percentage: number): string {
  if (percentage >= 80) return 'text-green-700 bg-green-50';
  if (percentage >= 50) return 'text-amber-700 bg-amber-50';
  return 'text-red-700 bg-red-50';
}

function getBarColor(percentage: number): string {
  if (percentage >= 80) return 'bg-green-500';
  if (percentage >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

export function ScorecardMetric({ metric, onClick }: ScorecardMetricProps) {
  return (
    <button
      type="button"
      className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:bg-gray-50"
      onClick={() => onClick?.(metric.key)}
      aria-label={`${metric.label}: ${metric.percentage}%`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{metric.label}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-sm font-bold ${getColor(metric.percentage)}`}
        >
          {metric.percentage}%
        </span>
      </div>
      <div className="mb-1 h-2 w-full rounded-full bg-gray-100">
        <div
          className={`h-2 rounded-full transition-all ${getBarColor(metric.percentage)}`}
          style={{ width: `${metric.percentage}%` }}
          role="progressbar"
          aria-valuenow={metric.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="text-xs text-gray-500">
        {metric.value} of {metric.total}
      </div>
    </button>
  );
}
