'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/patterns/page-header';
import { ErrorState } from '@/components/patterns/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCommissionStatement, useApproveStatement, useRejectStatement } from '@/hooks/use-commissions';
import { toast } from 'sonner';
import type { CommissionStatementStatus, CommissionEntryResponse } from '@/hooks/use-commissions';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

function getEntryTypeBadgeVariant(entryType: CommissionEntryResponse['entryType']): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (entryType) {
    case 'reversal':
      return 'destructive';
    case 'credit':
      return 'secondary';
    default:
      return 'outline';
  }
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function DetailSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
      </div>
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
      <Card>
        <CardContent className="p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="mb-2 h-5 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CommissionStatementDetailPage(): React.ReactElement {
  const params = useParams();
  const statementId = params['id'] as string;

  const { data, isLoading, isError, refetch } = useCommissionStatement(statementId);
  const approveStatement = useApproveStatement();
  const rejectStatement = useRejectStatement();

  const statement = data?.data;

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isError || !statement) {
    return (
      <ErrorState
        title="Statement not found"
        message="The commission statement could not be loaded."
        onRetry={() => void refetch()}
      />
    );
  }

  function handleApprove(): void {
    approveStatement.mutate(statementId, {
      onSuccess: () => {
        toast.success('Statement approved');
      },
      onError: () => {
        toast.error('Failed to approve statement');
      },
    });
  }

  function handleReject(): void {
    rejectStatement.mutate(
      { statementId, reason: 'Needs review' },
      {
        onSuccess: () => {
          toast.success('Statement rejected');
        },
        onError: () => {
          toast.error('Failed to reject statement');
        },
      },
    );
  }

  const entries = statement.entries ?? [];
  const disputes = statement.disputes ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${statement.repName} — ${MONTHS[statement.month - 1]} ${statement.year}`}
        breadcrumbs={[
          { label: 'Commissions', href: '/commissions' },
          { label: `${MONTHS[statement.month - 1]} ${statement.year}` },
        ]}
        actions={
          statement.status === 'pending' ? (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectStatement.isPending}
              >
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={approveStatement.isPending}
              >
                {approveStatement.isPending ? 'Approving...' : 'Approve'}
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Earned</p>
            <p className="text-xl font-semibold">{formatCurrency(statement.totalEarned)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Year-to-Date</p>
            <p className="text-xl font-semibold">{formatCurrency(statement.ytdTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={getStatusBadgeVariant(statement.status)} className="mt-1">
              {statement.status.charAt(0).toUpperCase() + statement.status.slice(1)}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commission Entries ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No entries</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{entry.accountName}</p>
                      <Badge variant={getEntryTypeBadgeVariant(entry.entryType)} className="text-xs">
                        {entry.entryType}
                      </Badge>
                      {entry.disputeStatus && (
                        <Badge variant="destructive" className="text-xs">
                          Disputed
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.brandName} • Order #{entry.orderNumber} • Rate: {formatPercent(entry.effectiveRate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(entry.commissionAmount)}</p>
                    <p className="text-xs text-muted-foreground">on {formatCurrency(entry.lineItemTotal)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {disputes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Disputes ({disputes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {disputes.map((dispute) => (
                <div key={dispute.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">Filed by {dispute.filerName}</p>
                      <Badge variant={dispute.status === 'open' ? 'destructive' : 'secondary'}>
                        {dispute.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(dispute.originalAmount)}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{dispute.reason}</p>
                  {dispute.resolvedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Resolved {formatDate(dispute.resolvedAt)}
                      {dispute.adjustedAmount !== null && ` • Adjusted to ${formatCurrency(dispute.adjustedAmount)}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
