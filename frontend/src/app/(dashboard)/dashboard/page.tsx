'use client';

import Link from 'next/link';

import { KpiStrip } from '@/components/dashboard/kpi-strip';
import { RepRankingTable } from '@/components/dashboard/rep-ranking-table';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { SkeletonCard } from '@/components/shared/skeleton';
import { useRepKpi, useTeamDashboard } from '@/hooks/use-dashboard';

export default function DashboardPage() {
  const {
    data: kpiData,
    isLoading: kpiLoading,
    error: kpiError,
    refetch: refetchKpi,
  } = useRepKpi();
  const {
    data: teamData,
    isLoading: teamLoading,
    error: teamError,
    refetch: refetchTeam,
  } = useTeamDashboard();

  if (kpiError) {
    return <ErrorBanner message="Unable to load dashboard" onRetry={() => refetchKpi()} />;
  }

  if (kpiLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!kpiData) {
    return (
      <EmptyState
        title="No activity yet"
        description="Start by visiting your accounts"
        action={
          <Link
            href="/accounts"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            View Accounts
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <KpiStrip kpiData={kpiData} />

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Team Performance</h2>
        {teamError && (
          <ErrorBanner message="Unable to load team data" onRetry={() => refetchTeam()} />
        )}
        {teamLoading && <SkeletonCard />}
        {teamData && <RepRankingTable rankings={teamData.repRankings} />}
      </div>
    </div>
  );
}
