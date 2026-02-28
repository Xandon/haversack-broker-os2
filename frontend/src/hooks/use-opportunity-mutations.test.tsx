import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOpportunityDetail, useCreateOpportunity, useUpdateOpportunity } from './use-opportunity-mutations';

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

describe('FR-043: useOpportunityDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-043: fetches opportunity by ID', async () => {
    const mockResponse = {
      data: { id: 'opp-1', name: 'Big Deal', stage: 'proposal', estimatedValue: 50000 },
    };
    vi.mocked(apiClient).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useOpportunityDetail('opp-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.name).toBe('Big Deal');
  });

  test('FR-043: does not fetch when opportunityId is undefined', () => {
    renderHook(() => useOpportunityDetail(undefined), {
      wrapper: createWrapper(),
    });

    expect(vi.mocked(apiClient)).not.toHaveBeenCalled();
  });
});

describe('FR-043: useCreateOpportunity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-043: creates opportunity via POST', async () => {
    const mockResponse = {
      data: { id: 'opp-new', name: 'New Deal', stage: 'prospect' },
    };
    vi.mocked(apiClient).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useCreateOpportunity(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: 'New Deal',
      estimatedValue: 25000,
      expectedCloseDate: '2026-06-01',
      stage: 'prospect',
      accountId: 'acc-1',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vi.mocked(apiClient)).toHaveBeenCalledWith(
      '/api/opportunities',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('FR-043: useUpdateOpportunity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-043: updates opportunity via PUT', async () => {
    const mockResponse = {
      data: { id: 'opp-1', name: 'Updated Deal' },
    };
    vi.mocked(apiClient).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useUpdateOpportunity(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      opportunityId: 'opp-1',
      input: { name: 'Updated Deal', estimatedValue: 75000 },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vi.mocked(apiClient)).toHaveBeenCalledWith(
      '/api/opportunities/opp-1',
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});
