'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export type ImportEntityType = 'account' | 'contact' | 'product' | 'order';
export type ImportJobStatus = 'uploaded' | 'validating' | 'preview' | 'importing' | 'completed' | 'failed';

export interface ImportJob {
  id: string;
  entity_type: ImportEntityType;
  file_name: string;
  file_size: number;
  status: ImportJobStatus;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  imported_rows: number | null;
  column_mapping: Record<string, string> | null;
  errors: ImportValidationError[] | null;
  created_at: string;
  completed_at: string | null;
}

export interface ImportValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface ImportPreview {
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  errors: ImportValidationError[];
  sample_data: Record<string, unknown>[];
}

export interface DataQualityScore {
  id: string;
  overall_score: number;
  account_field_completeness_pct: number;
  contact_email_validity_pct: number;
  product_image_coverage_pct: number;
  duplicate_account_count: number;
  stale_account_count: number;
  created_at: string;
}

export interface ImportListFilters {
  page?: number;
  per_page?: number;
  entity_type?: ImportEntityType;
  status?: ImportJobStatus;
}

interface ImportJobResponse {
  data: ImportJob;
}

interface ImportPreviewResponse {
  data: ImportPreview;
}

interface ImportListResponse {
  data: ImportJob[];
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
}

interface DataQualityResponse {
  data: {
    current: DataQualityScore;
    trend: DataQualityScore[];
  };
}

// -------------------------------------------------------------------
// Query keys
// -------------------------------------------------------------------

const IMPORT_KEYS = {
  all: ['imports'] as const,
  lists: () => [...IMPORT_KEYS.all, 'list'] as const,
  list: (filters: ImportListFilters) => [...IMPORT_KEYS.lists(), filters] as const,
  details: () => [...IMPORT_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...IMPORT_KEYS.details(), id] as const,
  preview: (id: string) => [...IMPORT_KEYS.all, 'preview', id] as const,
} as const;

const DATA_QUALITY_KEYS = {
  all: ['data-quality'] as const,
  scorecard: () => [...DATA_QUALITY_KEYS.all, 'scorecard'] as const,
} as const;

// -------------------------------------------------------------------
// useImports — paginated import job list
// -------------------------------------------------------------------

interface UseImportsResult {
  imports: ImportJob[];
  pagination: ImportListResponse['pagination'] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useImports(filters: ImportListFilters = {}): UseImportsResult {
  const query = useQuery<ImportListResponse, Error>({
    queryKey: IMPORT_KEYS.list(filters),
    queryFn: async (): Promise<ImportListResponse> => {
      const params = new URLSearchParams();
      if (filters.page != null) params.set('page', String(filters.page));
      if (filters.per_page != null) params.set('per_page', String(filters.per_page));
      if (filters.entity_type) params.set('entity_type', filters.entity_type);
      if (filters.status) params.set('status', filters.status);

      const queryString = params.toString();
      const path = queryString ? `/api/imports?${queryString}` : '/api/imports';
      return apiClient.get<ImportListResponse>(path);
    },
  });

  return {
    imports: query.data?.data ?? [],
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// -------------------------------------------------------------------
// useImportPreview — get import validation preview
// -------------------------------------------------------------------

interface UseImportPreviewResult {
  preview: ImportPreview | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useImportPreview(importJobId: string): UseImportPreviewResult {
  const query = useQuery<ImportPreviewResponse, Error>({
    queryKey: IMPORT_KEYS.preview(importJobId),
    queryFn: async (): Promise<ImportPreviewResponse> => {
      return apiClient.get<ImportPreviewResponse>(`/api/imports/${importJobId}/preview`);
    },
    enabled: importJobId.length > 0,
  });

  return {
    preview: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// -------------------------------------------------------------------
// useUploadImport — mutation for uploading an import file
// -------------------------------------------------------------------

interface UseUploadImportResult {
  uploadImport: (entityType: ImportEntityType, file: File) => void;
  uploadImportAsync: (entityType: ImportEntityType, file: File) => Promise<ImportJobResponse>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  data: ImportJobResponse | undefined;
}

export function useUploadImport(): UseUploadImportResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<ImportJobResponse, Error, { entityType: ImportEntityType; file: File }>({
    mutationFn: async ({ entityType, file }): Promise<ImportJobResponse> => {
      return apiClient.post<ImportJobResponse>('/api/imports/upload', {
        entity_type: entityType,
        file_name: file.name,
        file_size: file.size,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: IMPORT_KEYS.all });
    },
  });

  return {
    uploadImport: (entityType: ImportEntityType, file: File) =>
      mutation.mutate({ entityType, file }),
    uploadImportAsync: (entityType: ImportEntityType, file: File) =>
      mutation.mutateAsync({ entityType, file }),
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
}

// -------------------------------------------------------------------
// useExecuteImport — mutation for executing an import
// -------------------------------------------------------------------

interface UseExecuteImportResult {
  executeImport: (importJobId: string, importValidOnly?: boolean) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useExecuteImport(): UseExecuteImportResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<ImportJobResponse, Error, { importJobId: string; importValidOnly: boolean }>({
    mutationFn: async ({ importJobId, importValidOnly }): Promise<ImportJobResponse> => {
      return apiClient.post<ImportJobResponse>(`/api/imports/${importJobId}/execute`, {
        import_valid_only: importValidOnly,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: IMPORT_KEYS.all });
    },
  });

  return {
    executeImport: (importJobId: string, importValidOnly = true) =>
      mutation.mutate({ importJobId, importValidOnly }),
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

// -------------------------------------------------------------------
// useDataQuality — data quality scorecard
// -------------------------------------------------------------------

interface UseDataQualityResult {
  current: DataQualityScore | undefined;
  trend: DataQualityScore[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useDataQuality(): UseDataQualityResult {
  const query = useQuery<DataQualityResponse, Error>({
    queryKey: DATA_QUALITY_KEYS.scorecard(),
    queryFn: async (): Promise<DataQualityResponse> => {
      return apiClient.get<DataQualityResponse>('/api/data-quality');
    },
  });

  return {
    current: query.data?.data.current,
    trend: query.data?.data.trend ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// -------------------------------------------------------------------
// useRecalculateDataQuality — trigger recalculation
// -------------------------------------------------------------------

interface UseRecalculateDataQualityResult {
  recalculate: () => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useRecalculateDataQuality(): UseRecalculateDataQualityResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<void, Error, void>({
    mutationFn: async (): Promise<void> => {
      await apiClient.post('/api/data-quality/recalculate');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DATA_QUALITY_KEYS.all });
    },
  });

  return {
    recalculate: () => mutation.mutate(),
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
