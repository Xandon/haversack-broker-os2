import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement } from 'react';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

import { useReports, useReport, useCreateReport, useDeleteReport, useExecuteReport } from './use-reports';

function createWrapper(): ({ children }: { children: ReactNode }) => React.ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): React.ReactElement {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const mockReport = {
  id: 'rpt-1',
  name: 'Monthly Orders',
  description: 'All orders this month',
  entityType: 'ORDER' as const,
  filters: { dateRange: { start: '2026-01-01', end: '2026-01-31' } },
  columns: ['orderNumber', 'accountName', 'total', 'status'],
  isShared: false,
  createdByName: 'Admin User',
  lastRunAt: '2026-02-15T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('FR-046: useReports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-046: fetches reports list', async () => {
    const { apiClient } = await import('@/lib/api-client');
    (apiClient as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: [mockReport],
      pagination: { cursor: null, hasMore: false, total: 1 },
    });

    const { result } = renderHook(() => useReports(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].name).toBe('Monthly Orders');
  });
});

describe('FR-046: useReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-046: fetches single report', async () => {
    const { apiClient } = await import('@/lib/api-client');
    (apiClient as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockReport });

    const { result } = renderHook(() => useReport('rpt-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.entityType).toBe('ORDER');
  });
});

describe('FR-046: useCreateReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-046: creates a report', async () => {
    const { apiClient } = await import('@/lib/api-client');
    (apiClient as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockReport });

    const { result } = renderHook(() => useCreateReport(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: 'Monthly Orders',
      entityType: 'ORDER',
      columns: ['orderNumber', 'total'],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient).toHaveBeenCalledWith('/api/reports', expect.objectContaining({ method: 'POST' }));
  });
});

describe('FR-046: useDeleteReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-046: deletes a report', async () => {
    const { apiClient } = await import('@/lib/api-client');
    (apiClient as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ message: 'Report deleted' });

    const { result } = renderHook(() => useDeleteReport(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('rpt-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient).toHaveBeenCalledWith('/api/reports/rpt-1', expect.objectContaining({ method: 'DELETE' }));
  });
});

describe('FR-046: useExecuteReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-046: executes a report', async () => {
    const { apiClient } = await import('@/lib/api-client');
    (apiClient as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: [{ orderNumber: 'ORD-001', total: 5000 }],
      pagination: { cursor: null, hasMore: false, total: 1 },
      truncated: false,
      columns: [
        { key: 'orderNumber', label: 'Order Number', type: 'string' },
        { key: 'total', label: 'Total', type: 'currency' },
      ],
    });

    const { result } = renderHook(() => useExecuteReport(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      entityType: 'ORDER',
      columns: ['orderNumber', 'total'],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.columns).toHaveLength(2);
  });
});
