import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface AccountListItem {
  id: string;
  name: string;
  accountType: string;
  territoryId: string;
  territory: { id: string; name: string };
  healthScore: number | null;
  updatedAt: string;
}

export interface AccountListResponse {
  data: AccountListItem[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}

export interface UseAccountsParams {
  territoryId?: string;
  accountType?: string;
  healthScoreMin?: number;
  healthScoreMax?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  cursor?: string;
  limit?: number;
}

function buildQueryString(params: UseAccountsParams): string {
  const searchParams = new URLSearchParams();

  if (params.territoryId) searchParams.set('territoryId', params.territoryId);
  if (params.accountType) searchParams.set('accountType', params.accountType);
  if (params.healthScoreMin !== undefined) searchParams.set('healthScoreMin', String(params.healthScoreMin));
  if (params.healthScoreMax !== undefined) searchParams.set('healthScoreMax', String(params.healthScoreMax));
  if (params.search) searchParams.set('search', params.search);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export function useAccounts(params: UseAccountsParams): ReturnType<typeof useQuery<AccountListResponse>> {
  return useQuery<AccountListResponse>({
    queryKey: ['accounts', params],
    queryFn: async () => {
      const response = await apiClient<AccountListResponse>(
        `/api/accounts${buildQueryString(params)}`,
      );
      return response;
    },
  });
}
