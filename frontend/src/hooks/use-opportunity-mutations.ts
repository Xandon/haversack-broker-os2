import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { OpportunityResponse } from '@haversack/shared';

export interface CreateOpportunityInput {
  name: string;
  estimatedValue: number;
  expectedCloseDate: string;
  stage: string;
  accountId: string;
  repId?: string;
  brandIds?: string[];
  probability?: number;
}

export interface UpdateOpportunityInput {
  name?: string;
  estimatedValue?: number;
  expectedCloseDate?: string;
  repId?: string;
  brandIds?: string[];
}

export function useOpportunityDetail(
  opportunityId: string | undefined,
): ReturnType<typeof useQuery<{ data: OpportunityResponse }>> {
  return useQuery<{ data: OpportunityResponse }>({
    queryKey: ['opportunities', opportunityId],
    queryFn: async () => {
      const response = await apiClient<{ data: OpportunityResponse }>(
        `/api/opportunities/${opportunityId}`,
      );
      return response;
    },
    enabled: Boolean(opportunityId),
  });
}

export function useCreateOpportunity(): ReturnType<
  typeof useMutation<{ data: OpportunityResponse }, Error, CreateOpportunityInput>
> {
  const queryClient = useQueryClient();

  return useMutation<{ data: OpportunityResponse }, Error, CreateOpportunityInput>({
    mutationFn: async (input) => {
      const response = await apiClient<{ data: OpportunityResponse }>('/api/opportunities', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      void queryClient.invalidateQueries({ queryKey: ['pipeline-summary'] });
    },
  });
}

export function useUpdateOpportunity(): ReturnType<
  typeof useMutation<{ data: OpportunityResponse }, Error, { opportunityId: string; input: UpdateOpportunityInput }>
> {
  const queryClient = useQueryClient();

  return useMutation<{ data: OpportunityResponse }, Error, { opportunityId: string; input: UpdateOpportunityInput }>({
    mutationFn: async ({ opportunityId, input }) => {
      const response = await apiClient<{ data: OpportunityResponse }>(
        `/api/opportunities/${opportunityId}`,
        {
          method: 'PUT',
          body: JSON.stringify(input),
        },
      );
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      void queryClient.invalidateQueries({ queryKey: ['pipeline-summary'] });
    },
  });
}
