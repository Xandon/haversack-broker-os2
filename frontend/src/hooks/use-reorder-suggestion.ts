import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface ReorderSuggestionItem {
  productId: string;
  productName: string;
  sku: string;
  brandName: string;
  suggestedQuantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ReorderSuggestionResponse {
  data: {
    suggestions: ReorderSuggestionItem[];
    estimatedTotal: number;
    discontinuedCount: number;
    aiGenerated: boolean;
  };
}

export function useReorderSuggestion(
  accountId: string | undefined,
): ReturnType<typeof useQuery<ReorderSuggestionResponse>> {
  return useQuery<ReorderSuggestionResponse>({
    queryKey: ['reorder-suggestion', accountId],
    queryFn: async () => {
      const response = await apiClient<ReorderSuggestionResponse>(
        `/api/accounts/${accountId}/reorder-suggestion`,
      );
      return response;
    },
    enabled: Boolean(accountId),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
