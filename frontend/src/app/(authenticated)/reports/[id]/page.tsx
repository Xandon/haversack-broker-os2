'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/patterns/page-header';
import { ErrorState } from '@/components/patterns/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useReport, useExecuteReport, useExportReport } from '@/hooks/use-reports';
import { toast } from 'sonner';
import { Download, Play } from 'lucide-react';
import type { ColumnMetadata, ExecuteReportResponse, ReportExportFormat } from '@/hooks/use-reports';

function formatCellValue(value: unknown, type: ColumnMetadata['type']): string {
  if (value === null || value === undefined) return '—';
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
    case 'number':
      return new Intl.NumberFormat('en-US').format(Number(value));
    case 'date':
      return new Date(String(value)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    case 'boolean':
      return value ? 'Yes' : 'No';
    default:
      return String(value);
  }
}

function DetailSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-64" />
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

export default function ReportDetailPage(): React.ReactElement {
  const params = useParams();
  const reportId = params['id'] as string;

  const { data, isLoading, isError, refetch } = useReport(reportId);
  const executeReport = useExecuteReport();
  const exportReport = useExportReport();

  const report = data?.data;
  const results: ExecuteReportResponse | undefined = executeReport.data;

  function handleRun(): void {
    executeReport.mutate(
      { reportId },
      {
        onError: () => {
          toast.error('Failed to run report');
        },
      },
    );
  }

  function handleExport(format: ReportExportFormat): void {
    if (!report) return;
    exportReport.mutate(
      { reportId, format },
      {
        onSuccess: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `report-${report.entityType}-${new Date().toISOString().slice(0, 10)}.${format}`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success(`Exported as ${format.toUpperCase()}`);
        },
        onError: () => {
          toast.error('Failed to export report');
        },
      },
    );
  }

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isError || !report) {
    return (
      <ErrorState
        title="Report not found"
        message="The report could not be loaded."
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={report.name}
        breadcrumbs={[
          { label: 'Reports', href: '/reports' },
          { label: report.name },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleExport('csv')}
              disabled={exportReport.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('xlsx')}
              disabled={exportReport.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              XLSX
            </Button>
            <Button
              onClick={handleRun}
              disabled={executeReport.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              {executeReport.isPending ? 'Running...' : 'Run Report'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Entity Type</p>
            <Badge className="mt-1">{report.entityType}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Columns</p>
            <p className="mt-1 text-sm font-medium">{report.columns.join(', ')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Created By</p>
            <p className="mt-1 text-sm font-medium">{report.createdByName}</p>
          </CardContent>
        </Card>
      </div>

      {report.description && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="mt-1 text-sm">{report.description}</p>
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Results ({results.pagination.total} records)
              {results.truncated && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">(truncated)</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    {results.columns.map((col) => (
                      <th key={col.key} scope="col" className="pb-2 pr-4">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.data.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {results.columns.map((col) => (
                        <td key={col.key} className="py-2 pr-4">
                          {formatCellValue(row[col.key], col.type)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {results.data.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No results found</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
