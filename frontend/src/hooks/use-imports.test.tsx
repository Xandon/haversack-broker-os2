import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { useImports, useImportDetail, useConfirmImport, useLayoutOfTruth } from './use-imports';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from '@/lib/api-client';

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('FR-049: useImports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-049: fetches import list', async () => {
    const mockResponse = {
      data: [{ id: 'imp-1', entityType: 'account', filename: 'accounts.csv', status: 'completed' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    };
    vi.mocked(apiClient).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useImports(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient).toHaveBeenCalledWith('/api/admin/imports');
    expect(result.current.data?.data).toHaveLength(1);
  });

  test('FR-049: fetches imports with entity filter', async () => {
    vi.mocked(apiClient).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });

    const { result } = renderHook(() => useImports({ entityType: 'product' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient).toHaveBeenCalledWith('/api/admin/imports?entityType=product');
  });
});

describe('FR-049: useImportDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-049: fetches import detail', async () => {
    const mockResponse = {
      data: { id: 'imp-1', entityType: 'account', filename: 'accounts.csv', status: 'completed' },
    };
    vi.mocked(apiClient).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useImportDetail('imp-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient).toHaveBeenCalledWith('/api/admin/imports/imp-1');
  });
});

describe('FR-049: useConfirmImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-049: calls POST /api/admin/imports/:id/confirm', async () => {
    const mockResponse = { data: { id: 'imp-1', status: 'processing' } };
    vi.mocked(apiClient).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useConfirmImport(), { wrapper: createWrapper() });

    result.current.mutate({ importId: 'imp-1', skipErrors: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient).toHaveBeenCalledWith('/api/admin/imports/imp-1/confirm', {
      method: 'POST',
      body: JSON.stringify({ skipErrors: true }),
    });
  });
});

describe('FR-049: useLayoutOfTruth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-049: fetches layout of truth for entity type', async () => {
    const mockResponse = {
      data: {
        entityType: 'account',
        fields: [
          { name: 'name', type: 'string', required: true, maxLength: 255 },
          { name: 'accountType', type: 'enum', required: true, allowedValues: ['retail', 'restaurant', 'distributor'] },
        ],
      },
    };
    vi.mocked(apiClient).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useLayoutOfTruth('account'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient).toHaveBeenCalledWith('/api/admin/layout-of-truth/account');
    expect(result.current.data?.data.fields).toHaveLength(2);
  });
});
