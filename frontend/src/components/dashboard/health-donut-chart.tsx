'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface HealthDonutChartProps {
  data: { healthy: number; atRisk: number; critical: number } | undefined;
  isLoading: boolean;
}

const COLORS: Record<string, string> = {
  Healthy: '#22c55e',
  'At Risk': '#eab308',
  Critical: '#ef4444',
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }): React.ReactElement | null {
  if (!active || !payload || !payload.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded border bg-background p-2 text-sm shadow-sm">
      <p className="font-medium">{entry.name}</p>
      <p className="text-muted-foreground">{entry.value} accounts</p>
    </div>
  );
}

export function HealthDonutChart({ data, isLoading }: HealthDonutChartProps): React.ReactElement {
  const router = useRouter();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mx-auto h-48 w-48 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Health Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">No health data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'Healthy', value: data.healthy },
    { name: 'At Risk', value: data.atRisk },
    { name: 'Critical', value: data.critical },
  ].filter((d) => d.value > 0);

  const total = data.healthy + data.atRisk + data.critical;

  function handleClick(entry: { name: string }): void {
    const healthFilters: Record<string, string> = {
      'Healthy': 'healthy',
      'At Risk': 'at_risk',
      'Critical': 'critical',
    };
    const filter = healthFilters[entry.name];
    if (filter) {
      router.push(`/accounts?health=${filter}`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Account Health Distribution</CardTitle>
        <p className="text-sm text-muted-foreground">{total} total accounts</p>
      </CardHeader>
      <CardContent>
        <div className="h-48" data-testid="health-donut-chart">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                onClick={handleClick}
                style={{ cursor: 'pointer' }}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
