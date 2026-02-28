'use client';

import { useMutation, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export type ImportEntityType = 'account' | 'contact' | 'product' | 'order';

export interface FieldDefinition {
  name: string;
  label: string;
  type: string;
  required: boolean;
  allowedValues?: string[];
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ImportPreview {
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: ValidationError[];
  unmappedColumns: string[];
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: ValidationError[];
}

export function useImportFields(entityType?: ImportEntityType) {
  return useQuery<FieldDefinition[]>({
    queryKey: ['imports', 'fields', entityType],
    queryFn: () => apiClient.get(`/api/imports/fields/${entityType}`),
    enabled: !!entityType,
  });
}

export function useValidateImport() {
  return useMutation<
    ImportPreview,
    Error,
    { entityType: ImportEntityType; rows: Record<string, string>[] }
  >({
    mutationFn: (params) => apiClient.post('/api/imports/validate', params),
  });
}

export function useExecuteImport() {
  return useMutation<
    ImportResult,
    Error,
    {
      entityType: ImportEntityType;
      rows: Record<string, string>[];
      assignedRepId?: string;
      territoryId?: string;
      brandId?: string;
    }
  >({
    mutationFn: (params) => apiClient.post('/api/imports/execute', params),
  });
}
