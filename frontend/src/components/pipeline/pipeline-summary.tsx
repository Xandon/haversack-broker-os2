'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export interface PipelineSummaryProps {
  weightedTotal: number;
  totalOpenValue: number;
  opportunityCount: number;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export function PipelineSummary({
  weightedTotal,
  totalOpenValue,
  opportunityCount,
  isLoading,
}: PipelineSummaryProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="h-6 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Weighted Forecast</p>
          <p className="text-xl font-semibold">{formatCurrency(weightedTotal)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Total Open Value</p>
          <p className="text-xl font-semibold">{formatCurrency(totalOpenValue)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Open Opportunities</p>
          <p className="text-xl font-semibold">{opportunityCount}</p>
        </CardContent>
      </Card>
    </div>
  );
}
