import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type ImportEntityType = 'account' | 'contact' | 'product' | 'order';
export type ImportStatus = 'pending' | 'validating' | 'previewed' | 'processing' | 'completed' | 'failed';

export interface ImportRecord {
  id: string;
  tenantId: string;
  createdBy: string;
  entityType: ImportEntityType;
  filename: string;
  fileSize: number;
  totalRows: number;
  validRows: number;
  errorRows: number;
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  status: ImportStatus;
  errorLog: unknown | null;
  warnings: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ImportError {
  row: number;
  field: string;
  error: string;
}

export interface ImportUploadResponse {
  data: {
    id: string;
    status: 'previewed';
    entityType: ImportEntityType;
    filename: string;
    totalRows: number;
    validRows: number;
    errorRows: number;
    errors: ImportError[];
    warnings: string[];
  };
}

export interface ImportConfirmResponse {
  data: {
    id: string;
    status: 'processing';
  };
}

export interface ImportListResponse {
  data: ImportRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ImportDetailResponse {
  data: ImportRecord;
}

export interface LayoutOfTruthField {
  name: string;
  type: 'string' | 'email' | 'uuid' | 'enum' | 'number' | 'date' | 'boolean';
  required: boolean;
  maxLength?: number;
  allowedValues?: string[];
  description?: string;
}

export interface LayoutOfTruthResponse {
  data: {
    entityType: ImportEntityType;
    fields: LayoutOfTruthField[];
  };
}

export interface UseImportsParams {
  entityType?: ImportEntityType;
  page?: number;
  limit?: number;
}

export function useImports(
  params: UseImportsParams = {},
): ReturnType<typeof useQuery<ImportListResponse>> {
  const searchParams = new URLSearchParams();
  if (params.entityType) searchParams.set('entityType', params.entityType);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();

  return useQuery<ImportListResponse>({
    queryKey: ['imports', params],
    queryFn: async () => {
      const response = await apiClient<ImportListResponse>(
        `/api/admin/imports${qs ? `?${qs}` : ''}`,
      );
      return response;
    },
  });
}

export function useImportDetail(
  importId: string | undefined,
): ReturnType<typeof useQuery<ImportDetailResponse>> {
  return useQuery<ImportDetailResponse>({
    queryKey: ['imports', importId],
    queryFn: async () => {
      const response = await apiClient<ImportDetailResponse>(
        `/api/admin/imports/${importId}`,
      );
      return response;
    },
    enabled: Boolean(importId),
  });
}

export function useUploadImport(): ReturnType<
  typeof useMutation<ImportUploadResponse, Error, { file: File; entityType: ImportEntityType }>
> {
  const queryClient = useQueryClient();

  return useMutation<ImportUploadResponse, Error, { file: File; entityType: ImportEntityType }>({
    mutationFn: async ({ file, entityType }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);

      const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
      const response = await fetch(`${API_BASE_URL}/api/admin/imports/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(errorData?.message ?? `Upload failed: ${response.status}`);
      }

      return response.json() as Promise<ImportUploadResponse>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['imports'] });
    },
  });
}

export function useConfirmImport(): ReturnType<
  typeof useMutation<ImportConfirmResponse, Error, { importId: string; skipErrors?: boolean }>
> {
  const queryClient = useQueryClient();

  return useMutation<ImportConfirmResponse, Error, { importId: string; skipErrors?: boolean }>({
    mutationFn: async ({ importId, skipErrors }) => {
      const response = await apiClient<ImportConfirmResponse>(
        `/api/admin/imports/${importId}/confirm`,
        {
          method: 'POST',
          body: JSON.stringify({ skipErrors: skipErrors ?? true }),
        },
      );
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['imports'] });
    },
  });
}

export function useLayoutOfTruth(
  entityType: ImportEntityType | undefined,
): ReturnType<typeof useQuery<LayoutOfTruthResponse>> {
  return useQuery<LayoutOfTruthResponse>({
    queryKey: ['layout-of-truth', entityType],
    queryFn: async () => {
      const response = await apiClient<LayoutOfTruthResponse>(
        `/api/admin/layout-of-truth/${entityType}`,
      );
      return response;
    },
    enabled: Boolean(entityType),
  });
}
