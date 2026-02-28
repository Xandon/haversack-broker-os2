import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBrands, useBrand } from './use-brands';

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

describe('FR-041: useBrands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-041: fetches brands list with counts', async () => {
    const mockResponse = {
      data: [{ id: 'b-1', name: 'Oregon Bee Co', productCount: 5, activeProductCount: 4 }],
      pagination: { cursor: null, hasMore: false, total: 1 },
    };
    vi.mocked(apiClient).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useBrands({}), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].name).toBe('Oregon Bee Co');
  });

  test('FR-041: passes isActive filter', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({ data: [], pagination: { cursor: null, hasMore: false, total: 0 } });

    renderHook(() => useBrands({ isActive: true }), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(vi.mocked(apiClient)).toHaveBeenCalledWith(
        expect.stringContaining('isActive=true'),
      );
    });
  });

  test('FR-041: handles empty results', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({ data: [], pagination: { cursor: null, hasMore: false, total: 0 } });

    const { result } = renderHook(() => useBrands({}), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(0);
  });
});

describe('FR-041: useBrand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-041: fetches brand detail by id', async () => {
    const mockResponse = {
      data: { id: 'b-1', name: 'Oregon Bee Co', commissionRate: 12, isActive: true },
    };
    vi.mocked(apiClient).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useBrand('b-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.name).toBe('Oregon Bee Co');
  });

  test('FR-041: does not fetch when brandId is undefined', () => {
    const { result } = renderHook(() => useBrand(undefined), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
    expect(vi.mocked(apiClient)).not.toHaveBeenCalled();
  });
});
