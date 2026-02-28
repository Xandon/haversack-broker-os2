import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface OpportunityItem {
  id: string;
  name: string;
  estimatedValue: number;
  probability: number;
  weightedValue: number;
  expectedCloseDate: string;
  stage: string;
  closeReason: string | null;
  closedAt: string | null;
  accountId: string;
  accountName: string;
  repId: string;
  repName: string;
  brands: { id: string; name: string }[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityListResponse {
  data: OpportunityItem[];
  pagination: {
    cursor?: string;
    hasMore?: boolean;
    total?: number;
  };
}

export function useAccountOpportunities(
  accountId: string,
): ReturnType<typeof useQuery<OpportunityListResponse>> {
  return useQuery<OpportunityListResponse>({
    queryKey: ['account-opportunities', accountId],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('accountId', accountId);
      searchParams.set('sortBy', 'createdAt');
      searchParams.set('sortOrder', 'desc');
      const response = await apiClient<OpportunityListResponse>(
        `/api/opportunities?${searchParams.toString()}`,
      );
      return response;
    },
    enabled: Boolean(accountId),
  });
}
