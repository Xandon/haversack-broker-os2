'use client';

import type { ReportEntityType, ReportFilter } from '@haversack/shared';
import { useMutation, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';


export interface ColumnDef {
  key: string;
  label: string;
}

export interface ReportResult {
  rows: Record<string, unknown>[];
  totalCount: number;
  page: number;
  limit: number;
}

export function useReportColumns(entityType?: ReportEntityType) {
  return useQuery<ColumnDef[]>({
    queryKey: ['reports', 'columns', entityType],
    queryFn: () => apiClient.get(`/api/reports/columns/${entityType}`),
    enabled: !!entityType,
  });
}

export function useRunReport() {
  return useMutation<
    ReportResult,
    Error,
    {
      entityType: ReportEntityType;
      filters: ReportFilter[];
      columns: string[];
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    }
  >({
    mutationFn: (params) => apiClient.post('/api/reports/run', params),
  });
}

export function useExportReport() {
  return useMutation<
    | string
    | { columns: ColumnDef[]; rows: Record<string, unknown>[]; entityType: string; format: string },
    Error,
    {
      entityType: ReportEntityType;
      filters: ReportFilter[];
      columns: string[];
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      format: 'csv' | 'xlsx';
    }
  >({
    mutationFn: (params) => apiClient.post('/api/reports/export', params),
  });
}
