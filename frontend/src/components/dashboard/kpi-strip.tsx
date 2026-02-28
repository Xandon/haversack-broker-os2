'use client';

import { KpiCard } from './kpi-card';

import type { RepKpiData } from '@/hooks/use-dashboard';


interface KpiStripProps {
  kpiData: RepKpiData;
  onHealthClick?: (category: 'healthy' | 'atRisk' | 'critical') => void;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export function KpiStrip({ kpiData, onHealthClick }: KpiStripProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      <KpiCard
        label="Revenue (MTD)"
        value={formatCurrency(kpiData.currentMonthRevenue)}
        subValue={`T12M: ${formatCurrency(kpiData.trailingTwelveMonthRevenue)}`}
      />
      <KpiCard
        label="Activities"
        value={String(kpiData.activitiesThisMonth)}
        subValue={`${kpiData.accountsManaged} accounts managed`}
      />
      <KpiCard
        label="Pipeline"
        value={String(kpiData.openOpportunities)}
        subValue={`Weighted: ${formatCurrency(kpiData.weightedPipelineValue)}`}
      />
      <KpiCard
        label="Commission (MTD)"
        value={formatCurrency(kpiData.commissionMtd)}
        subValue={`YTD: ${formatCurrency(kpiData.commissionYtd)}`}
        variant="success"
      />
      <KpiCard
        label="Account Health"
        value={`${kpiData.healthDistribution.healthy} healthy`}
        subValue={`${kpiData.healthDistribution.atRisk} at-risk · ${kpiData.healthDistribution.critical} critical`}
        variant={kpiData.healthDistribution.critical > 0 ? 'danger' : 'default'}
        onClick={
          kpiData.healthDistribution.critical > 0 ? () => onHealthClick?.('critical') : undefined
        }
      />
    </div>
  );
}
