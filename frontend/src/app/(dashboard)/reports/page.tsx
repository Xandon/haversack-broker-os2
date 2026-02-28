'use client';

import { ReportBuilder } from '@/components/reports/report-builder';
import { ErrorBanner } from '@/components/shared/error-banner';
import { useRunReport, useExportReport } from '@/hooks/use-reports';

export default function ReportsPage() {
  const runReport = useRunReport();
  const exportReport = useExportReport();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      {runReport.error && (
        <ErrorBanner message="Unable to generate report" onRetry={() => runReport.reset()} />
      )}

      <ReportBuilder
        onRunReport={(params) => runReport.mutate(params)}
        onExport={(params) => exportReport.mutate(params)}
        reportResult={runReport.data}
        isRunning={runReport.isPending}
        isExporting={exportReport.isPending}
      />
    </div>
  );
}
