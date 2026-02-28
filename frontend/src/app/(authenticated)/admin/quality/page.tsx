'use client';

import * as React from 'react';
import { PageHeader } from '@/components/patterns/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/patterns/error-state';
import {
  useQualityScorecard,
  useQualityDrillDown,
} from '@/hooks/use-quality';
import type { QualityDrillDownMetric } from '@/hooks/use-quality';
import {
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronLeft,
} from 'lucide-react';

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-50 border-green-200';
  if (score >= 60) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}

function TrendIndicator({ value }: { value: number }): React.ReactElement {
  if (value > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-green-600" data-testid="trend-up">
        <ArrowUp className="h-3 w-3" />
        {value}%
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-red-600" data-testid="trend-down">
        <ArrowDown className="h-3 w-3" />
        {Math.abs(value)}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-xs text-muted-foreground" data-testid="trend-stable">
      <Minus className="h-3 w-3" />
      Stable
    </span>
  );
}

interface MetricCardProps {
  title: string;
  value: number;
  suffix: string;
  trend: number;
  metricKey: QualityDrillDownMetric;
  onViewDetails: (metric: QualityDrillDownMetric) => void;
}

function MetricCard({
  title,
  value,
  suffix,
  trend,
  metricKey,
  onViewDetails,
}: MetricCardProps): React.ReactElement {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`mt-1 text-2xl font-bold ${getScoreColor(suffix === '%' ? value : (value === 0 ? 100 : Math.max(0, 100 - value * 5)))}`}>
            {value}{suffix}
          </p>
        </div>
        <TrendIndicator value={trend} />
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 text-xs"
        onClick={() => onViewDetails(metricKey)}
      >
        View Details
      </Button>
    </Card>
  );
}

function DrillDownTable({
  metric,
  onBack,
}: {
  metric: QualityDrillDownMetric;
  onBack: () => void;
}): React.ReactElement {
  const { data, isLoading, isError } = useQualityDrillDown(metric);

  const metricLabels: Record<QualityDrillDownMetric, string> = {
    accountCompleteness: 'Account Completeness',
    contactEmailValidity: 'Contact Email Validity',
    productImages: 'Product Images',
    duplicateAccounts: 'Duplicate Accounts',
    staleAccounts: 'Stale Accounts',
  };

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back to Scorecard
      </Button>
      <h3 className="mb-4 text-lg font-medium">{metricLabels[metric]} — Affected Records</h3>
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}
      {isError && <ErrorState title="Failed to load drill-down data" message="Could not retrieve affected records. Please try again." />}
      {data && (
        <>
          <p className="mb-2 text-sm text-muted-foreground">
            {data.data.total} affected record{data.data.total !== 1 ? 's' : ''}
          </p>
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium">Name</th>
                  <th className="p-3 text-left font-medium">Issue</th>
                </tr>
              </thead>
              <tbody>
                {data.data.items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-3">{item.name}</td>
                    <td className="p-3 text-muted-foreground">{item.issue}</td>
                  </tr>
                ))}
                {data.data.items.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-6 text-center text-muted-foreground">
                      No affected records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default function QualityPage(): React.ReactElement {
  const { data, isLoading, isError, refetch } = useQualityScorecard();
  const [selectedMetric, setSelectedMetric] = React.useState<QualityDrillDownMetric | null>(null);

  const score = data?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Quality Scorecard"
        description="Monitor data health across your CRM"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Data Quality' },
        ]}
      />

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        </div>
      )}

      {isError && (
        <ErrorState title="Failed to load scorecard" message="Could not load data quality scorecard. Please try again." onRetry={() => refetch()} />
      )}

      {score && !selectedMetric && (
        <>
          <Card className={`border p-6 ${getScoreBgColor(score.compositeScore)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Composite Quality Score</p>
                <p className={`text-4xl font-bold ${getScoreColor(score.compositeScore)}`}>
                  {Math.round(score.compositeScore)}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                Last calculated: {new Date(score.calculatedAt).toLocaleDateString()}
              </Badge>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="Account Completeness"
              value={Math.round(score.accountCompleteness)}
              suffix="%"
              trend={0}
              metricKey="accountCompleteness"
              onViewDetails={setSelectedMetric}
            />
            <MetricCard
              title="Contact Email Validity"
              value={Math.round(score.contactEmailValidity)}
              suffix="%"
              trend={0}
              metricKey="contactEmailValidity"
              onViewDetails={setSelectedMetric}
            />
            <MetricCard
              title="Product Images"
              value={Math.round(score.productImages)}
              suffix="%"
              trend={0}
              metricKey="productImages"
              onViewDetails={setSelectedMetric}
            />
            <MetricCard
              title="Duplicate Accounts"
              value={score.duplicateAccountCount}
              suffix=""
              trend={0}
              metricKey="duplicateAccounts"
              onViewDetails={setSelectedMetric}
            />
            <MetricCard
              title="Stale Accounts"
              value={score.staleAccountCount}
              suffix=""
              trend={0}
              metricKey="staleAccounts"
              onViewDetails={setSelectedMetric}
            />
          </div>
        </>
      )}

      {selectedMetric && (
        <DrillDownTable metric={selectedMetric} onBack={() => setSelectedMetric(null)} />
      )}
    </div>
  );
}
