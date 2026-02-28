import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { useQualityScorecard, useQualityDrillDown } from './use-quality';

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

describe('FR-050: useQualityScorecard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-050: fetches quality scorecard data', async () => {
    const mockResponse = {
      data: {
        accountCompleteness: 85,
        contactEmailValidity: 92,
        productImages: 78,
        duplicateAccountCount: 3,
        staleAccountCount: 7,
        compositeScore: 82,
        calculatedAt: '2026-02-28T03:00:00Z',
      },
    };
    vi.mocked(apiClient).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useQualityScorecard(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient).toHaveBeenCalledWith('/api/admin/quality/scorecard');
    expect(result.current.data?.data.compositeScore).toBe(82);
  });
});

describe('FR-050: useQualityDrillDown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-050: fetches drill-down data for a metric', async () => {
    const mockResponse = {
      data: {
        metric: 'accountCompleteness',
        items: [
          { id: 'acc-1', name: 'Acme Corp', issue: 'Missing phone number' },
          { id: 'acc-2', name: 'Beta LLC', issue: 'Missing email' },
        ],
        total: 2,
        page: 1,
        limit: 50,
      },
    };
    vi.mocked(apiClient).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useQualityDrillDown('accountCompleteness'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient).toHaveBeenCalledWith(
      '/api/admin/quality/drill-down?metric=accountCompleteness&page=1&limit=50',
    );
    expect(result.current.data?.data.items).toHaveLength(2);
  });

  test('FR-050: does not fetch when metric is undefined', () => {
    const { result } = renderHook(
      () => useQualityDrillDown(undefined),
      { wrapper: createWrapper() },
    );

    expect(result.current.isFetching).toBe(false);
    expect(apiClient).not.toHaveBeenCalled();
  });
});
