'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface SearchResult {
  id: string;
  name: string;
  city: string;
  account_type: string;
}

interface SearchResponse {
  data: SearchResult[];
}

export interface UseSearchResult {
  data: SearchResult[];
  isLoading: boolean;
  error: Error | null;
}

// -------------------------------------------------------------------
// Query keys
// -------------------------------------------------------------------

const SEARCH_KEYS = {
  all: ['search'] as const,
  query: (q: string) => [...SEARCH_KEYS.all, q] as const,
} as const;

// -------------------------------------------------------------------
// Hook
// -------------------------------------------------------------------

export function useSearch(query: string): UseSearchResult {
  const trimmed = query.trim();
  const enabled = trimmed.length >= 2;

  const result = useQuery<SearchResponse, Error>({
    queryKey: SEARCH_KEYS.query(trimmed),
    queryFn: async (): Promise<SearchResponse> => {
      const encoded = encodeURIComponent(trimmed);
      return apiClient.get<SearchResponse>(`/api/accounts/search?q=${encoded}`);
    },
    enabled,
    staleTime: 30_000,
  });

  return {
    data: result.data?.data ?? [],
    isLoading: enabled && result.isLoading,
    error: result.error,
  };
}
