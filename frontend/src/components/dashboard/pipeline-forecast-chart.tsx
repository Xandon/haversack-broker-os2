'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import type { PipelineForecastData } from '@/hooks/use-dashboard';

interface PipelineForecastChartProps {
  data: PipelineForecastData | undefined;
  isLoading: boolean;
}

const STAGE_LABELS: Record<string, string> = {
  prospect: 'Prospect',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }): React.ReactElement | null {
  if (!active || !payload || !payload.length || !label) return null;
  return (
    <div className="rounded border bg-background p-2 text-sm shadow-sm">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function PipelineForecastChart({ data, isLoading }: PipelineForecastChartProps): React.ReactElement {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.stages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">No pipeline data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.stages.map((s) => ({
    stage: STAGE_LABELS[s.stage] ?? s.stage,
    totalValue: s.totalValue,
    weightedValue: s.weightedValue,
    count: s.count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pipeline Forecast</CardTitle>
        <p className="text-sm text-muted-foreground">
          Total: {formatCurrency(data.totalOpenValue)} open | {formatCurrency(data.totalWeightedForecast)} weighted
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-64" data-testid="pipeline-forecast-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="totalValue" name="Total Value" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="weightedValue" name="Weighted" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
