'use client';

import { REPORT_ENTITY_COLUMNS } from '@haversack/shared';
import type { ReportEntityType, ReportFilter } from '@haversack/shared';
import { useState, useCallback } from 'react';


import { ColumnSelector } from './column-selector';
import { EntityPicker } from './entity-picker';
import { ExportButton } from './export-button';
import { FilterBuilder } from './filter-builder';
import { ReportTable } from './report-table';


import type { ReportResult } from '@/hooks/use-reports';

interface ReportBuilderProps {
  onRunReport: (params: {
    entityType: ReportEntityType;
    filters: ReportFilter[];
    columns: string[];
    page: number;
  }) => void;
  onExport: (params: {
    entityType: ReportEntityType;
    filters: ReportFilter[];
    columns: string[];
    format: 'csv' | 'xlsx';
  }) => void;
  reportResult?: ReportResult;
  isRunning: boolean;
  isExporting: boolean;
}

export function ReportBuilder({
  onRunReport,
  onExport,
  reportResult,
  isRunning,
  isExporting,
}: ReportBuilderProps) {
  const [entityType, setEntityType] = useState<ReportEntityType | undefined>();
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const availableColumns = entityType ? (REPORT_ENTITY_COLUMNS[entityType] ?? []) : [];

  const handleEntityChange = useCallback((newType: ReportEntityType) => {
    setEntityType(newType);
    setFilters([]);
    const cols = REPORT_ENTITY_COLUMNS[newType] ?? [];
    setSelectedColumns(cols.map((c) => c.key));
    setCurrentPage(1);
  }, []);

  const handleRunReport = useCallback(() => {
    if (!entityType || selectedColumns.length === 0) return;
    onRunReport({ entityType, filters, columns: selectedColumns, page: currentPage });
  }, [entityType, filters, selectedColumns, currentPage, onRunReport]);

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      if (!entityType || selectedColumns.length === 0) return;
      onRunReport({ entityType, filters, columns: selectedColumns, page });
    },
    [entityType, filters, selectedColumns, onRunReport],
  );

  const handleExport = useCallback(
    (format: 'csv' | 'xlsx') => {
      if (!entityType || selectedColumns.length === 0) return;
      onExport({ entityType, filters, columns: selectedColumns, format });
    },
    [entityType, filters, selectedColumns, onExport],
  );

  const resultColumns = availableColumns.filter((c) => selectedColumns.includes(c.key));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Report Builder</h2>
        <div className="space-y-4">
          <EntityPicker value={entityType} onChange={handleEntityChange} />

          {entityType && (
            <>
              <ColumnSelector
                columns={availableColumns}
                selected={selectedColumns}
                onChange={setSelectedColumns}
              />
              <FilterBuilder columns={availableColumns} filters={filters} onChange={setFilters} />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRunReport}
                  disabled={selectedColumns.length === 0 || isRunning}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isRunning ? 'Running...' : 'Run Report'}
                </button>
                {reportResult && (
                  <ExportButton
                    onExport={handleExport}
                    isExporting={isExporting}
                    disabled={selectedColumns.length === 0}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {reportResult && (
        <ReportTable
          columns={resultColumns}
          rows={reportResult.rows}
          totalCount={reportResult.totalCount}
          page={reportResult.page}
          limit={reportResult.limit}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
