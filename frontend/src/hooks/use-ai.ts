'use client';

/**
 * TanStack Query hooks for AI features.
 * Provides reorder suggestion fetching and submission.
 * Implements FR-018, FR-035, FR-036.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface ReorderSuggestionItem {
  product_id: string;
  product_name: string;
  sku: string;
  brand_name: string;
  suggested_quantity: number;
  unit_price: number;
  line_total: number;
  reasoning: string;
}

export interface ReorderSuggestion {
  account_id: string;
  account_name: string;
  ai_generated: boolean;
  ai_label?: string;
  suggestion: {
    items: ReorderSuggestionItem[];
    estimated_total: number;
    based_on_orders: number;
    analysis_period_months: number;
  } | null;
  message?: string;
  current_order_count?: number;
  generated_at?: string;
}

interface ReorderSuggestionResponse {
  data: ReorderSuggestion;
}

export interface SubmitReorderPayload {
  account_id: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price?: number;
  }>;
  notes?: string;
}

interface SubmitReorderResponse {
  data: {
    order_id: string;
    order_number: string;
    status: string;
    total: number;
    source: string;
  };
}

// -------------------------------------------------------------------
// Query keys
// -------------------------------------------------------------------

const AI_KEYS = {
  all: ['ai'] as const,
  reorderSuggestions: () => [...AI_KEYS.all, 'reorder-suggestions'] as const,
  reorderSuggestion: (accountId: string) =>
    [...AI_KEYS.reorderSuggestions(), accountId] as const,
} as const;

// -------------------------------------------------------------------
// useReorderSuggestion — fetch AI reorder suggestion for an account
// -------------------------------------------------------------------

interface UseReorderSuggestionResult {
  suggestion: ReorderSuggestion | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useReorderSuggestion(
  accountId: string,
  options?: { enabled?: boolean },
): UseReorderSuggestionResult {
  const query = useQuery<ReorderSuggestionResponse, Error>({
    queryKey: AI_KEYS.reorderSuggestion(accountId),
    queryFn: async (): Promise<ReorderSuggestionResponse> => {
      return apiClient.post<ReorderSuggestionResponse>(
        '/api/ai/reorder-suggestions',
        { account_id: accountId },
      );
    },
    enabled: (options?.enabled ?? true) && accountId.length > 0,
    retry: false, // FR-036: don't retry AI calls — they may be expensive
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    suggestion: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}

// -------------------------------------------------------------------
// useSubmitReorder — submit modified suggestion as new order
// -------------------------------------------------------------------

interface UseSubmitReorderResult {
  submitReorder: (payload: SubmitReorderPayload) => void;
  submitReorderAsync: (payload: SubmitReorderPayload) => Promise<SubmitReorderResponse>;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
  data: SubmitReorderResponse | undefined;
}

export function useSubmitReorder(): UseSubmitReorderResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<SubmitReorderResponse, Error, SubmitReorderPayload>({
    mutationFn: async (
      payload: SubmitReorderPayload,
    ): Promise<SubmitReorderResponse> => {
      return apiClient.post<SubmitReorderResponse>(
        '/api/ai/reorder-suggestions/submit',
        payload,
      );
    },
    onSuccess: () => {
      // Invalidate orders list since a new order was created
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return {
    submitReorder: mutation.mutate,
    submitReorderAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    data: mutation.data,
  };
}
