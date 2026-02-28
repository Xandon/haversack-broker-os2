import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useReorderSuggestion } from './use-reorder-suggestion';

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

const MOCK_SUGGESTION = {
  data: {
    suggestions: [
      {
        productId: 'prod-1',
        productName: 'Artisan Honey 12oz',
        sku: 'AH-12',
        brandName: 'Pacific Honey Co',
        suggestedQuantity: 24,
        unitPrice: 10.0,
        lineTotal: 240.0,
      },
      {
        productId: 'prod-2',
        productName: 'Organic Jam 8oz',
        sku: 'OJ-8',
        brandName: 'Berry Farm',
        suggestedQuantity: 12,
        unitPrice: 8.5,
        lineTotal: 102.0,
      },
    ],
    estimatedTotal: 342.0,
    discontinuedCount: 1,
    aiGenerated: true,
  },
};

describe('FR-014: useReorderSuggestion hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-014: fetches reorder suggestion for account', async () => {
    mockApiClient.mockResolvedValue(MOCK_SUGGESTION);

    const { result } = renderHook(() => useReorderSuggestion('acc-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data.suggestions).toHaveLength(2);
    expect(result.current.data?.data.estimatedTotal).toBe(342.0);
    expect(result.current.data?.data.aiGenerated).toBe(true);
    expect(result.current.data?.data.discontinuedCount).toBe(1);
  });

  test('FR-014: disabled when accountId is undefined', () => {
    const { result } = renderHook(() => useReorderSuggestion(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockApiClient).not.toHaveBeenCalled();
  });

  test('FR-014: calls correct API endpoint', async () => {
    mockApiClient.mockResolvedValue(MOCK_SUGGESTION);

    renderHook(() => useReorderSuggestion('acc-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    const callPath = mockApiClient.mock.calls[0][0] as string;
    expect(callPath).toBe('/api/accounts/acc-123/reorder-suggestion');
  });

  test('FR-014: handles error when insufficient order history', async () => {
    mockApiClient.mockRejectedValue(new Error('INSUFFICIENT_HISTORY'));

    const { result } = renderHook(() => useReorderSuggestion('acc-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  test('FR-014: handles AI unavailable error', async () => {
    mockApiClient.mockRejectedValue(new Error('AI service unavailable'));

    const { result } = renderHook(() => useReorderSuggestion('acc-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
