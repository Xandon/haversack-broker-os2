'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useRepDashboard, useTeamDashboard, useRevenueByMonth, useTerritoryRevenue, usePipelineForecast } from '@/hooks/use-dashboard';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { CriticalAccountsList } from '@/components/dashboard/critical-accounts-list';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { TerritoryRevenueTable } from '@/components/dashboard/territory-revenue-table';
import { PipelineForecastChart } from '@/components/dashboard/pipeline-forecast-chart';
import { HealthDonutChart } from '@/components/dashboard/health-donut-chart';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type DashboardPeriod = 'current_month' | 'last_month' | 'current_quarter' | 'ytd' | 'trailing_12_months';

function RepDashboard({ period }: { period: DashboardPeriod }): React.ReactElement {
  const { data, isLoading } = useRepDashboard(period);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Current Month Revenue"
          value={data ? formatCurrency(data.revenue.currentMonth) : '$0'}
          subtitle="confirmed orders"
          isLoading={isLoading}
        />
        <KpiCard
          title="Trailing 12-Month Revenue"
          value={data ? formatCurrency(data.revenue.trailing12Months) : '$0'}
          isLoading={isLoading}
        />
        <KpiCard
          title="Activities This Period"
          value={data ? formatNumber(data.activities.currentMonthCount) : '0'}
          isLoading={isLoading}
        />
        <KpiCard
          title="Open Opportunities"
          value={data ? formatNumber(data.opportunities.openCount) : '0'}
          subtitle={data ? `${formatCurrency(data.opportunities.weightedPipelineValue)} weighted` : undefined}
          isLoading={isLoading}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          title="Commission This Month"
          value={data ? formatCurrency(data.commissions.currentMonth) : '$0'}
          isLoading={isLoading}
        />
        <KpiCard
          title="Commission YTD"
          value={data ? formatCurrency(data.commissions.ytd) : '$0'}
          isLoading={isLoading}
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Account Health</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : data ? (
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-green-600" aria-label={`${data.accountHealth.healthy} healthy accounts`}>
                  <span aria-hidden="true">&#9679;</span> {data.accountHealth.healthy} healthy
                </span>
                <span className="text-yellow-600" aria-label={`${data.accountHealth.atRisk} at risk accounts`}>
                  <span aria-hidden="true">&#9650;</span> {data.accountHealth.atRisk} at risk
                </span>
                <span className="text-red-600" aria-label={`${data.accountHealth.critical} critical accounts`}>
                  <span aria-hidden="true">&#9632;</span> {data.accountHealth.critical} critical
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <HealthDonutChart data={data?.accountHealth} isLoading={isLoading} />
      <CriticalAccountsList />
    </div>
  );
}

function TeamDashboard({ period }: { period: DashboardPeriod }): React.ReactElement {
  const { data, isLoading } = useTeamDashboard(period);
  const revenueByMonth = useRevenueByMonth(12);
  const territoryRevenue = useTerritoryRevenue(period);
  const pipelineForecast = usePipelineForecast();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Revenue"
          value={data ? formatCurrency(data.totals.totalRevenue) : '$0'}
          isLoading={isLoading}
        />
        <KpiCard
          title="Total Orders"
          value={data ? formatNumber(data.totals.totalOrders) : '0'}
          isLoading={isLoading}
        />
        <KpiCard
          title="Total Activities"
          value={data ? formatNumber(data.totals.totalActivities) : '0'}
          isLoading={isLoading}
        />
        <KpiCard
          title="Active Reps"
          value={data ? formatNumber(data.totals.activeRepCount) : '0'}
          subtitle={data ? `${formatCurrency(data.totals.totalPipelineValue)} pipeline` : undefined}
          isLoading={isLoading}
        />
      </div>

      <RevenueChart data={revenueByMonth.data} isLoading={revenueByMonth.isLoading} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TerritoryRevenueTable data={territoryRevenue.data} isLoading={territoryRevenue.isLoading} />
        <PipelineForecastChart data={pipelineForecast.data} isLoading={pipelineForecast.isLoading} />
      </div>

      {isLoading ? (
        <Card>
          <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : data && data.repRankings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rep Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th scope="col" className="pb-2 pr-4">#</th>
                    <th scope="col" className="pb-2 pr-4">Rep</th>
                    <th scope="col" className="pb-2 pr-4 text-right">Revenue</th>
                    <th scope="col" className="pb-2 pr-4 text-right">Orders</th>
                    <th scope="col" className="pb-2 pr-4 text-right">Activities</th>
                    <th scope="col" className="pb-2 text-right">Pipeline</th>
                  </tr>
                </thead>
                <tbody>
                  {data.repRankings.map((rep, i) => (
                    <tr key={rep.repId} className="border-b last:border-0">
                      <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                      <td className="py-2 pr-4">
                        {rep.repName}
                        {!rep.isActive && (
                          <span className="ml-1 text-xs text-muted-foreground">(inactive)</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(rep.revenue)}</td>
                      <td className="py-2 pr-4 text-right">{rep.orderCount}</td>
                      <td className="py-2 pr-4 text-right">{rep.activityCount}</td>
                      <td className="py-2 text-right">{formatCurrency(rep.pipelineValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default function DashboardPage(): React.ReactElement {
  const { user } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>('current_month');
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isManagerOrAdmin ? 'Team Dashboard' : 'Dashboard'}
        </h1>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>
      {isManagerOrAdmin ? (
        <TeamDashboard period={period} />
      ) : (
        <RepDashboard period={period} />
      )}
    </div>
  );
}
