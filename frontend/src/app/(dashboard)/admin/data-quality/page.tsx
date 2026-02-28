'use client';

import { DataQualityDashboard } from '@/components/data-quality/data-quality-dashboard';
import { ErrorBanner } from '@/components/shared/error-banner';
import { SkeletonCard } from '@/components/shared/skeleton';
import { useDataQualityScorecard } from '@/hooks/use-data-quality';

export default function DataQualityPage() {
  const { data, isLoading, error, refetch } = useDataQualityScorecard();

  if (error) {
    return <ErrorBanner message="Unable to load data quality scores" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Data Quality</h1>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : data ? (
        <DataQualityDashboard scorecard={data} />
      ) : null}
    </div>
  );
}
