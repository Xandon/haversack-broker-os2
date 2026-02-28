import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type ReportEntityType = 'ACCOUNT' | 'ORDER' | 'PRODUCT' | 'COMMISSION' | 'ACTIVITY';
export type ReportExportFormat = 'csv' | 'xlsx';

export interface ReportFilters {
  dateRange?: { start: string; end: string };
  territoryId?: string;
  brandId?: string;
  repId?: string;
  status?: string;
}

export interface ReportResponse {
  id: string;
  name: string;
  description: string | null;
  entityType: ReportEntityType;
  filters: ReportFilters;
  columns: string[];
  isShared: boolean;
  createdByName: string;
  lastRunAt: string | null;
  createdAt: string;
}

export interface ColumnMetadata {
  key: string;
  label: string;
  type: 'string' | 'number' | 'currency' | 'date' | 'boolean';
}

export interface ExecuteReportResponse {
  data: Array<Record<string, unknown>>;
  pagination: { cursor: string | null; hasMore: boolean; total: number };
  truncated: boolean;
  columns: ColumnMetadata[];
}

export interface CreateReportInput {
  name: string;
  description?: string;
  entityType: ReportEntityType;
  filters?: ReportFilters;
  columns: string[];
  isShared?: boolean;
}

export interface ExecuteReportInput {
  reportId?: string;
  entityType?: ReportEntityType;
  filters?: ReportFilters;
  columns?: string[];
  cursor?: string | null;
  limit?: number;
}

export interface ExportReportInput {
  reportId?: string;
  entityType?: ReportEntityType;
  filters?: ReportFilters;
  columns?: string[];
  format: ReportExportFormat;
}

export function useReports(
  params: { cursor?: string; limit?: number } = {},
): ReturnType<typeof useQuery<{ data: ReportResponse[]; pagination: { cursor: string | null; hasMore: boolean; total: number } }>> {
  const searchParams = new URLSearchParams();
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['reports', params],
    queryFn: async () => {
      const response = await apiClient<{ data: ReportResponse[]; pagination: { cursor: string | null; hasMore: boolean; total: number } }>(
        `/api/reports${qs ? `?${qs}` : ''}`,
      );
      return response;
    },
  });
}

export function useReport(
  reportId: string | undefined,
): ReturnType<typeof useQuery<{ data: ReportResponse }>> {
  return useQuery({
    queryKey: ['reports', reportId],
    queryFn: async () => {
      const response = await apiClient<{ data: ReportResponse }>(
        `/api/reports/${reportId}`,
      );
      return response;
    },
    enabled: Boolean(reportId),
  });
}

export function useCreateReport(): ReturnType<
  typeof useMutation<{ data: ReportResponse }, Error, CreateReportInput>
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReportInput) => {
      const response = await apiClient<{ data: ReportResponse }>(
        '/api/reports',
        { method: 'POST', body: JSON.stringify(input) },
      );
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useDeleteReport(): ReturnType<
  typeof useMutation<{ message: string }, Error, string>
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const response = await apiClient<{ message: string }>(
        `/api/reports/${reportId}`,
        { method: 'DELETE' },
      );
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useExecuteReport(): ReturnType<
  typeof useMutation<ExecuteReportResponse, Error, ExecuteReportInput>
> {
  return useMutation({
    mutationFn: async (input: ExecuteReportInput) => {
      const response = await apiClient<ExecuteReportResponse>(
        '/api/reports/execute',
        { method: 'POST', body: JSON.stringify(input) },
      );
      return response;
    },
  });
}

export function useExportReport(): ReturnType<
  typeof useMutation<Blob, Error, ExportReportInput>
> {
  return useMutation({
    mutationFn: async (input: ExportReportInput) => {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Export failed');
      }
      return response.blob();
    },
  });
}
