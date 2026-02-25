import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api-client';

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    // Do not retry client errors (4xx) except 408 (timeout) and 429 (rate limit)
    if (error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429) {
      return false;
    }
  }
  return failureCount < 3;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (garbage collection)
        retry: shouldRetry,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export const queryClient = createQueryClient();
