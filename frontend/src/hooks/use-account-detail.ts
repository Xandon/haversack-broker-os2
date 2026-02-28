import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface ContactItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountDetail {
  id: string;
  tenantId: string;
  name: string;
  accountType: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  territoryId: string;
  territory: { id: string; name: string };
  parentAccountId: string | null;
  parentAccount: { id: string; name: string } | null;
  childAccounts: { id: string; name: string }[];
  contacts: ContactItem[];
  healthScore: number | null;
  healthScoreCalculatedAt: string | null;
  healthScoreBreakdown: HealthScoreBreakdown | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface HealthScoreBreakdown {
  daysSinceLastActivity: { value: number; score: number; weight: number };
  orderFrequency: { value: number; score: number; weight: number };
  orderValueTrend: { value: number; score: number; weight: number };
  contactEngagement: { value: number; score: number; weight: number };
}

export interface AccountDetailResponse {
  data: AccountDetail;
}

export interface UpdateAccountInput {
  name?: string;
  accountType?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  territoryId?: string;
  parentAccountId?: string | null;
  isActive?: boolean;
}

export function useAccountDetail(
  accountId: string | undefined,
): ReturnType<typeof useQuery<AccountDetailResponse>> {
  return useQuery<AccountDetailResponse>({
    queryKey: ['accounts', accountId],
    queryFn: async () => {
      const response = await apiClient<AccountDetailResponse>(
        `/api/accounts/${accountId}`,
      );
      return response;
    },
    enabled: Boolean(accountId),
  });
}

export function useUpdateAccount(): ReturnType<
  typeof useMutation<
    AccountDetailResponse,
    Error,
    { accountId: string; input: UpdateAccountInput }
  >
> {
  const queryClient = useQueryClient();

  return useMutation<
    AccountDetailResponse,
    Error,
    { accountId: string; input: UpdateAccountInput }
  >({
    mutationFn: async ({ accountId, input }) => {
      const response = await apiClient<AccountDetailResponse>(
        `/api/accounts/${accountId}`,
        {
          method: 'PUT',
          body: JSON.stringify(input),
        },
      );
      return response;
    },
    onSuccess: (_data, { accountId }) => {
      void queryClient.invalidateQueries({ queryKey: ['accounts', accountId] });
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useDeleteAccount(): ReturnType<
  typeof useMutation<void, Error, string>
> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (accountId) => {
      await apiClient<void>(`/api/accounts/${accountId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
