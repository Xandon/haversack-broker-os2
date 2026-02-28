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
import { useReports, useDeleteReport } from '@/hooks/use-reports';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import type { ReportEntityType } from '@/hooks/use-reports';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getEntityBadgeVariant(entityType: ReportEntityType): 'default' | 'secondary' | 'outline' {
  switch (entityType) {
    case 'ORDER':
    case 'COMMISSION':
      return 'default';
    case 'ACCOUNT':
    case 'PRODUCT':
      return 'secondary';
    default:
      return 'outline';
  }
}

function ReportsSkeleton(): React.ReactElement {
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

export default function ReportsPage(): React.ReactElement {
  const { data, isLoading, isError, refetch } = useReports();
  const deleteReport = useDeleteReport();

  const reports = data?.data ?? [];

  function handleDelete(e: React.MouseEvent, reportId: string): void {
    e.preventDefault();
    e.stopPropagation();
    deleteReport.mutate(reportId, {
      onSuccess: () => {
        toast.success('Report deleted');
      },
      onError: () => {
        toast.error('Failed to delete report');
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Saved reports and report builder"
        actions={
          <Link href="/reports/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Report
            </Button>
          </Link>
        }
      />

      {isLoading && <ReportsSkeleton />}

      {isError && (
        <ErrorState
          title="Failed to load reports"
          message="There was an error loading reports."
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !isError && reports.length === 0 && (
        <EmptyState
          title="No reports yet"
          description="Create a custom report to get started."
        />
      )}

      {!isLoading && !isError && reports.length > 0 && (
        <div className="space-y-2">
          {reports.map((report) => (
            <Link key={report.id} href={`/reports/${report.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{report.name}</p>
                      <Badge variant={getEntityBadgeVariant(report.entityType)}>
                        {report.entityType}
                      </Badge>
                      {report.isShared && (
                        <Badge variant="outline">Shared</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {report.description ?? `${report.columns.length} columns`}
                      {report.lastRunAt && ` • Last run: ${formatDate(report.lastRunAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      by {report.createdByName}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(e, report.id)}
                      disabled={deleteReport.isPending}
                      aria-label={`Delete ${report.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
