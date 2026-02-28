import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useCommissionStatements,
  useCommissionStatement,
  useApproveStatement,
  useRejectStatement,
  useExportCommissions,
  useCommissionRules,
} from './use-commissions';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from '@/lib/api-client';

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('FR-044: useCommissionStatements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-044: fetches commission statements', async () => {
    const mockResponse = {
      data: [{ id: 'stmt-1', repName: 'John', month: 3, year: 2026, status: 'pending', totalEarned: 5000 }],
      pagination: { cursor: null, hasMore: false, total: 1 },
    };
    vi.mocked(apiClient).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useCommissionStatements(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
  });

  test('FR-044: passes filter params', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({ data: [], pagination: { cursor: null, hasMore: false, total: 0 } });

    renderHook(() => useCommissionStatements({ status: 'approved', year: 2026 }), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(vi.mocked(apiClient)).toHaveBeenCalledWith(expect.stringContaining('status=approved'));
    });
  });
});

describe('FR-044: useCommissionStatement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-044: fetches single statement with entries', async () => {
    const mockResponse = {
      data: { id: 'stmt-1', repName: 'John', totalEarned: 5000, entries: [], disputes: [] },
    };
    vi.mocked(apiClient).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useCommissionStatement('stmt-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.totalEarned).toBe(5000);
  });
});

describe('FR-044: useApproveStatement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-044: approves statement via POST', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({ data: { id: 'stmt-1', status: 'approved' } });

    const { result } = renderHook(() => useApproveStatement(), { wrapper: createWrapper() });

    result.current.mutate('stmt-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vi.mocked(apiClient)).toHaveBeenCalledWith(
      '/api/commissions/statements/stmt-1/approve',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('FR-044: useRejectStatement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-044: rejects statement with reason', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({ data: { id: 'stmt-1', status: 'pending' } });

    const { result } = renderHook(() => useRejectStatement(), { wrapper: createWrapper() });

    result.current.mutate({ statementId: 'stmt-1', reason: 'Calculation error' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vi.mocked(apiClient)).toHaveBeenCalledWith(
      '/api/commissions/statements/stmt-1/reject',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('FR-044: useExportCommissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-044: exports commissions for a month', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({
      data: { csv: 'header\nrow1', statementsIncluded: 5, totalAmount: 25000 },
    });

    const { result } = renderHook(() => useExportCommissions(), { wrapper: createWrapper() });

    result.current.mutate({ month: 3, year: 2026 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vi.mocked(apiClient)).toHaveBeenCalledWith(
      '/api/commissions/export',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('FR-044: useCommissionRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-044: fetches commission rules', async () => {
    const mockResponse = {
      data: [{ id: 'rule-1', brandName: 'Oregon Bee Co', baseRate: 0.10, isActive: true }],
      pagination: { cursor: null, hasMore: false, total: 1 },
    };
    vi.mocked(apiClient).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useCommissionRules(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
  });
});
