import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useAccountDetail, useUpdateAccount, useDeleteAccount } from './use-account-detail';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from '@/lib/api-client';

const mockApiClient = vi.mocked(apiClient);

function createWrapper(): React.ComponentType<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const MOCK_ACCOUNT_DETAIL = {
  data: {
    id: 'acc-1',
    tenantId: 'tenant-1',
    name: 'Pacific Bistro',
    accountType: 'restaurant',
    streetAddress: '123 Main St',
    city: 'Portland',
    state: 'OR',
    zipCode: '97201',
    territoryId: 'ter-1',
    territory: { id: 'ter-1', name: 'Portland Metro' },
    parentAccountId: null,
    parentAccount: null,
    childAccounts: [],
    contacts: [
      {
        id: 'con-1',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@pacific.com',
        phone: '503-555-0100',
        title: 'Head Chef',
        isPrimary: true,
        createdAt: '2026-02-26T10:00:00Z',
        updatedAt: '2026-02-26T10:00:00Z',
      },
    ],
    healthScore: 72,
    healthScoreCalculatedAt: '2026-02-26T02:00:00Z',
    healthScoreBreakdown: {
      daysSinceLastActivity: { value: 5, score: 85, weight: 0.3 },
      orderFrequency: { value: 3, score: 70, weight: 0.25 },
      orderValueTrend: { value: 1.2, score: 65, weight: 0.25 },
      contactEngagement: { value: 10, score: 60, weight: 0.2 },
    },
    isActive: true,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-02-26T14:00:00Z',
    deletedAt: null,
  },
};

describe('FR-002: useAccountDetail hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-002: fetches account detail by ID', async () => {
    mockApiClient.mockResolvedValue(MOCK_ACCOUNT_DETAIL);

    const { result } = renderHook(() => useAccountDetail('acc-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data.name).toBe('Pacific Bistro');
    expect(result.current.data?.data.territory.name).toBe('Portland Metro');
    expect(result.current.data?.data.contacts).toHaveLength(1);
    expect(result.current.data?.data.healthScore).toBe(72);
  });

  test('FR-002: calls correct API path', async () => {
    mockApiClient.mockResolvedValue(MOCK_ACCOUNT_DETAIL);

    renderHook(() => useAccountDetail('acc-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    expect(mockApiClient).toHaveBeenCalledWith('/api/accounts/acc-1');
  });

  test('FR-002: disabled when accountId is undefined', () => {
    const { result } = renderHook(() => useAccountDetail(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });

  test('FR-002: handles error state', async () => {
    mockApiClient.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useAccountDetail('acc-invalid'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  test('FR-002: includes health score breakdown in response', async () => {
    mockApiClient.mockResolvedValue(MOCK_ACCOUNT_DETAIL);

    const { result } = renderHook(() => useAccountDetail('acc-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const breakdown = result.current.data?.data.healthScoreBreakdown;
    expect(breakdown).toBeDefined();
    expect(breakdown?.daysSinceLastActivity.weight).toBe(0.3);
    expect(breakdown?.orderFrequency.weight).toBe(0.25);
  });
});

describe('FR-001: useUpdateAccount mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-001: updates account with PUT request', async () => {
    mockApiClient.mockResolvedValue(MOCK_ACCOUNT_DETAIL);

    const { result } = renderHook(() => useUpdateAccount(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        accountId: 'acc-1',
        input: { name: 'Pacific Bistro Updated' },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiClient).toHaveBeenCalledWith(
      '/api/accounts/acc-1',
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});

describe('FR-001: useDeleteAccount mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-001: soft-deletes account with DELETE request', async () => {
    mockApiClient.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('acc-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiClient).toHaveBeenCalledWith(
      '/api/accounts/acc-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
