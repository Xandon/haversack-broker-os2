import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useShareLineCard } from './use-line-card';

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

describe('FR-041: useShareLineCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-041: calls share endpoint with brandId and accountId', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useShareLineCard(), { wrapper: createWrapper() });

    result.current.mutate({ brandId: 'b-1', accountId: 'acc-1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vi.mocked(apiClient)).toHaveBeenCalledWith(
      '/api/brands/b-1/line-card/share',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  test('FR-041: handles share failure', async () => {
    vi.mocked(apiClient).mockRejectedValueOnce(new Error('Share failed'));

    const { result } = renderHook(() => useShareLineCard(), { wrapper: createWrapper() });

    result.current.mutate({ brandId: 'b-1', accountId: 'acc-1' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Share failed');
  });
});
