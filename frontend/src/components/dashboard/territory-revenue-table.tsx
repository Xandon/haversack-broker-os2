'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { TerritoryRevenue } from '@/hooks/use-dashboard';

interface TerritoryRevenueTableProps {
  data: TerritoryRevenue[] | undefined;
  isLoading: boolean;
}

export function TerritoryRevenueTable({ data, isLoading }: TerritoryRevenueTableProps): React.ReactElement {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Territory Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">No territory data available</p>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...data].sort((a, b) => b.revenue - a.revenue);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Territory Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th scope="col" className="pb-2 pr-4">Territory</th>
                <th scope="col" className="pb-2 pr-4 text-right">Revenue</th>
                <th scope="col" className="pb-2 pr-4 text-right">Orders</th>
                <th scope="col" className="pb-2 text-right">Accounts</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((territory) => (
                <tr key={territory.territoryId} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{territory.territoryName}</td>
                  <td className="py-2 pr-4 text-right">{formatCurrency(territory.revenue)}</td>
                  <td className="py-2 pr-4 text-right">{formatNumber(territory.orderCount)}</td>
                  <td className="py-2 text-right">{formatNumber(territory.accountCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
