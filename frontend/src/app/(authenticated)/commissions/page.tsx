'use client';

import * as React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/patterns/page-header';
import { ErrorState } from '@/components/patterns/error-state';
import { EmptyState } from '@/components/patterns/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useCommissionStatements, useExportCommissions } from '@/hooks/use-commissions';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import type { CommissionStatementStatus } from '@/hooks/use-commissions';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}

function getStatusBadgeVariant(status: CommissionStatementStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved':
      return 'default';
    case 'exported':
      return 'secondary';
    case 'paid':
      return 'default';
    default:
      return 'outline';
  }
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function StatementsSkeleton(): React.ReactElement {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="space-y-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function CommissionsPage(): React.ReactElement {
  const currentDate = new Date();
  const [filters, setFilters] = React.useState({
    status: '',
    year: currentDate.getFullYear(),
    month: 0,
  });

  const queryParams = {
    ...(filters.status && { status: filters.status }),
    ...(filters.year && { year: filters.year }),
    ...(filters.month > 0 && { month: filters.month }),
  };

  const { data, isLoading, isError, refetch } = useCommissionStatements(queryParams);
  const exportCommissions = useExportCommissions();

  const statements = data?.data ?? [];

  function handleExport(): void {
    const month = filters.month || currentDate.getMonth() + 1;
    const year = filters.year || currentDate.getFullYear();

    exportCommissions.mutate(
      { month, year },
      {
        onSuccess: (result) => {
          // Create download
          const blob = new Blob([result.data.csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `commissions-${year}-${String(month).padStart(2, '0')}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success(`Exported ${result.data.statementsIncluded} statements`);
        },
        onError: () => {
          toast.error('Failed to export commissions');
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commissions"
        description="Commission statements and tracking"
        actions={
          <Button onClick={handleExport} disabled={exportCommissions.isPending} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            {exportCommissions.isPending ? 'Exporting...' : 'Export to QB'}
          </Button>
        }
      />

      <div className="flex flex-wrap gap-4">
        <Select
          value={String(filters.year)}
          onChange={(e) => setFilters((prev) => ({ ...prev, year: Number(e.target.value) }))}
          className="w-32"
        >
          <option value="2026">2026</option>
          <option value="2025">2025</option>
        </Select>

        <Select
          value={String(filters.month)}
          onChange={(e) => setFilters((prev) => ({ ...prev, month: Number(e.target.value) }))}
          className="w-40"
        >
          <option value="0">All months</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>{name}</option>
          ))}
        </Select>

        <Select
          value={filters.status}
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          className="w-36"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="exported">Exported</option>
          <option value="paid">Paid</option>
        </Select>
      </div>

      {isLoading && <StatementsSkeleton />}

      {isError && (
        <ErrorState
          title="Failed to load commissions"
          message="There was an error loading commission statements."
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !isError && statements.length === 0 && (
        <EmptyState
          title="No statements found"
          description="No commission statements match your filters."
        />
      )}

      {!isLoading && !isError && statements.length > 0 && (
        <div className="space-y-2">
          {statements.map((stmt) => (
            <Link key={stmt.id} href={`/commissions/${stmt.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{stmt.repName}</p>
                    <p className="text-sm text-muted-foreground">
                      {MONTHS[stmt.month - 1]} {stmt.year}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(stmt.totalEarned)}</p>
                      <p className="text-xs text-muted-foreground">YTD: {formatCurrency(stmt.ytdTotal)}</p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(stmt.status)}>
                      {stmt.status.charAt(0).toUpperCase() + stmt.status.slice(1)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
