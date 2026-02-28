'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/patterns/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateReport, useExecuteReport, useExportReport } from '@/hooks/use-reports';
import { toast } from 'sonner';
import { Download, Play, Save } from 'lucide-react';
import type { ReportEntityType, ReportFilters, ColumnMetadata, ExecuteReportResponse, ReportExportFormat } from '@/hooks/use-reports';

const ENTITY_TYPES: { value: ReportEntityType; label: string }[] = [
  { value: 'ACCOUNT', label: 'Accounts' },
  { value: 'ORDER', label: 'Orders' },
  { value: 'PRODUCT', label: 'Products' },
  { value: 'COMMISSION', label: 'Commissions' },
  { value: 'ACTIVITY', label: 'Activities' },
];

const AVAILABLE_COLUMNS: Record<ReportEntityType, { key: string; label: string }[]> = {
  ACCOUNT: [
    { key: 'name', label: 'Account Name' },
    { key: 'accountType', label: 'Account Type' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'territoryName', label: 'Territory' },
    { key: 'createdAt', label: 'Created' },
  ],
  ORDER: [
    { key: 'orderNumber', label: 'Order Number' },
    { key: 'accountName', label: 'Account' },
    { key: 'total', label: 'Total' },
    { key: 'status', label: 'Status' },
    { key: 'revenueModel', label: 'Revenue Model' },
    { key: 'notes', label: 'Notes' },
    { key: 'createdAt', label: 'Created' },
  ],
  PRODUCT: [
    { key: 'name', label: 'Product Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'brandName', label: 'Brand' },
    { key: 'unitPrice', label: 'Unit Price' },
    { key: 'wholesalePrice', label: 'Wholesale Price' },
    { key: 'availabilityStatus', label: 'Availability' },
    { key: 'isActive', label: 'Active' },
  ],
  COMMISSION: [
    { key: 'repName', label: 'Rep Name' },
    { key: 'orderNumber', label: 'Order Number' },
    { key: 'commissionAmount', label: 'Amount' },
    { key: 'entryType', label: 'Entry Type' },
    { key: 'effectiveRate', label: 'Rate' },
    { key: 'lineItemTotal', label: 'Line Item Total' },
    { key: 'calculatedAt', label: 'Calculated' },
  ],
  ACTIVITY: [
    { key: 'activityType', label: 'Type' },
    { key: 'subject', label: 'Subject' },
    { key: 'accountName', label: 'Account' },
    { key: 'repName', label: 'Rep' },
    { key: 'notes', label: 'Notes' },
    { key: 'duration', label: 'Duration (min)' },
    { key: 'createdAt', label: 'Created' },
  ],
};

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

export default function ReportBuilderPage(): React.ReactElement {
  const router = useRouter();
  const createReport = useCreateReport();
  const executeReport = useExecuteReport();
  const exportReport = useExportReport();

  const [name, setName] = React.useState('');
  const [entityType, setEntityType] = React.useState<ReportEntityType>('ACCOUNT');
  const [selectedColumns, setSelectedColumns] = React.useState<string[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({});

  const availableColumns = AVAILABLE_COLUMNS[entityType];
  const results: ExecuteReportResponse | undefined = executeReport.data;

  function handleEntityChange(newType: ReportEntityType): void {
    setEntityType(newType);
    setSelectedColumns([]);
  }

  function handleColumnToggle(columnKey: string): void {
    setSelectedColumns((prev) =>
      prev.includes(columnKey)
        ? prev.filter((c) => c !== columnKey)
        : [...prev, columnKey],
    );
  }

  function handleSelectAll(): void {
    if (selectedColumns.length === availableColumns.length) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns(availableColumns.map((c) => c.key));
    }
  }

  function handlePreview(): void {
    if (selectedColumns.length === 0) {
      toast.error('Select at least one column');
      return;
    }
    executeReport.mutate(
      { entityType, columns: selectedColumns, filters, limit: 50 },
      {
        onError: () => {
          toast.error('Failed to run report preview');
        },
      },
    );
  }

  function handleSave(): void {
    if (!name.trim()) {
      toast.error('Enter a report name');
      return;
    }
    if (selectedColumns.length === 0) {
      toast.error('Select at least one column');
      return;
    }
    createReport.mutate(
      { name: name.trim(), entityType, columns: selectedColumns, filters },
      {
        onSuccess: () => {
          toast.success('Report saved');
          router.push('/reports');
        },
        onError: () => {
          toast.error('Failed to save report');
        },
      },
    );
  }

  function handleExport(format: ReportExportFormat): void {
    if (selectedColumns.length === 0) {
      toast.error('Select at least one column');
      return;
    }
    exportReport.mutate(
      { entityType, columns: selectedColumns, filters, format },
      {
        onSuccess: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `report-${entityType}-${new Date().toISOString().slice(0, 10)}.${format}`;
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Report"
        breadcrumbs={[
          { label: 'Reports', href: '/reports' },
          { label: 'New Report' },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="report-name">Report Name</Label>
                <Input
                  id="report-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Monthly Orders Summary"
                />
              </div>
              <div>
                <Label htmlFor="entity-type">Entity Type</Label>
                <Select
                  id="entity-type"
                  value={entityType}
                  onChange={(e) => handleEntityChange(e.target.value as ReportEntityType)}
                >
                  {ENTITY_TYPES.map((et) => (
                    <option key={et.value} value={et.value}>{et.label}</option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="filter-start">Start Date</Label>
                <Input
                  id="filter-start"
                  type="date"
                  value={filters.dateRange?.start ?? ''}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateRange: { start: e.target.value, end: prev.dateRange?.end ?? '' },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="filter-end">End Date</Label>
                <Input
                  id="filter-end"
                  type="date"
                  value={filters.dateRange?.end ?? ''}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateRange: { start: prev.dateRange?.start ?? '', end: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="filter-status">Status</Label>
                <Input
                  id="filter-status"
                  value={filters.status ?? ''}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, status: e.target.value || undefined }))
                  }
                  placeholder="e.g., confirmed"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Columns</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                {selectedColumns.length === availableColumns.length ? 'Deselect All' : 'Select All'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {availableColumns.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(col.key)}
                      onChange={() => handleColumnToggle(col.key)}
                      className="rounded border-gray-300"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePreview} disabled={executeReport.isPending || selectedColumns.length === 0}>
              <Play className="mr-2 h-4 w-4" />
              {executeReport.isPending ? 'Running...' : 'Preview'}
            </Button>
            <Button variant="outline" onClick={handleSave} disabled={createReport.isPending || selectedColumns.length === 0}>
              <Save className="mr-2 h-4 w-4" />
              {createReport.isPending ? 'Saving...' : 'Save Report'}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('csv')}
              disabled={exportReport.isPending || selectedColumns.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('xlsx')}
              disabled={exportReport.isPending || selectedColumns.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              XLSX
            </Button>
          </div>

          {executeReport.isPending && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {results && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Preview ({results.pagination.total} records)
                  {results.truncated && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">(results truncated)</span>
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

          {!results && !executeReport.isPending && (
            <Card>
              <CardContent className="flex items-center justify-center p-12">
                <p className="text-sm text-muted-foreground">
                  Select columns and click Preview to see results
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
