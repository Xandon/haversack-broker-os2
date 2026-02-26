'use client';

import { clsx } from 'clsx';

import { useDataQuality, useRecalculateDataQuality } from '@/hooks/use-imports';
import { SkeletonLoader } from '@/components/shared/skeleton-loader';

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-700';
  if (score >= 60) return 'text-yellow-700';
  return 'text-red-700';
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-green-50 border-green-200';
  if (score >= 60) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}

function getBarColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// -------------------------------------------------------------------
// Score Card Component
// -------------------------------------------------------------------

interface ScoreCardProps {
  label: string;
  value: number;
  unit: string;
}

function ScoreCard({ label, value, unit }: ScoreCardProps): React.JSX.Element {
  return (
    <div className={clsx('rounded-lg border p-4', getScoreBg(value))}>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={clsx('text-2xl font-bold', getScoreColor(value))}>
          {value}
        </span>
        <span className="text-sm text-gray-500">{unit}</span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
        <div
          className={clsx('h-2 rounded-full transition-all', getBarColor(value))}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// Page Component
// -------------------------------------------------------------------

export default function DataQualityPage(): React.JSX.Element {
  const { current, trend, isLoading, isError, error } = useDataQuality();
  const { recalculate, isLoading: isRecalculating } = useRecalculateDataQuality();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Quality Scorecard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Nightly metrics for data completeness, validity, and health.
          </p>
        </div>
        <button
          type="button"
          onClick={recalculate}
          disabled={isRecalculating}
          className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRecalculating ? 'Recalculating...' : 'Recalculate Now'}
        </button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="mt-6">
          <SkeletonLoader variant="card" count={3} />
        </div>
      ) : null}

      {/* Error state */}
      {isError ? (
        <div className="mt-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Failed to load data quality scorecard: {error?.message ?? 'Unknown error'}
          </p>
        </div>
      ) : null}

      {/* Scorecard */}
      {!isLoading && !isError && current ? (
        <>
          {/* Overall score */}
          <div className={clsx('mt-6 rounded-lg border p-6 text-center', getScoreBg(current.overall_score))}>
            <p className="text-sm font-medium text-gray-600">Overall Data Quality Score</p>
            <p className={clsx('mt-2 text-5xl font-bold', getScoreColor(current.overall_score))}>
              {current.overall_score}
            </p>
            <p className="mt-1 text-sm text-gray-500">out of 100</p>
            <p className="mt-2 text-xs text-gray-400">
              Last calculated: {formatDate(current.created_at)}
            </p>
          </div>

          {/* Metric cards */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ScoreCard
              label="Account Field Completeness"
              value={current.account_field_completeness_pct}
              unit="%"
            />
            <ScoreCard
              label="Contact Email Validity"
              value={current.contact_email_validity_pct}
              unit="%"
            />
            <ScoreCard
              label="Product Image Coverage"
              value={current.product_image_coverage_pct}
              unit="%"
            />
          </div>

          {/* Counts */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm font-medium text-gray-600">Duplicate Accounts</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {current.duplicate_account_count}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm font-medium text-gray-600">Stale Accounts (90+ days)</p>
              <p className={clsx(
                'mt-2 text-2xl font-bold',
                current.stale_account_count > 10 ? 'text-red-700' : 'text-gray-900',
              )}>
                {current.stale_account_count}
              </p>
            </div>
          </div>

          {/* Trend table */}
          {trend.length > 0 ? (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900">7-Day Trend</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 rounded-lg border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Overall</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Fields</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Email</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Images</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Stale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {trend.map((score) => (
                      <tr key={score.id}>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                          {formatDate(score.created_at)}
                        </td>
                        <td className={clsx('whitespace-nowrap px-4 py-3 text-right text-sm font-medium', getScoreColor(score.overall_score))}>
                          {score.overall_score}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600">
                          {score.account_field_completeness_pct}%
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600">
                          {score.contact_email_validity_pct}%
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600">
                          {score.product_image_coverage_pct}%
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600">
                          {score.stale_account_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {/* No data state */}
      {!isLoading && !isError && !current ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            No scorecard data yet. Click &quot;Recalculate Now&quot; or wait for the nightly job.
          </p>
        </div>
      ) : null}
    </div>
  );
}
