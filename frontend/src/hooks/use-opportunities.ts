import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { OpportunityResponse } from '@haversack/shared';

export type { OpportunityResponse };

export type PipelineStage = 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

export interface OpportunityListApiResponse {
  data: OpportunityResponse[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}

export interface UseOpportunitiesParams {
  stage?: string;
  accountId?: string;
  repId?: string;
  sortBy?: string;
  sortOrder?: string;
  cursor?: string;
  limit?: number;
}

function buildQueryString(params: UseOpportunitiesParams): string {
  const searchParams = new URLSearchParams();

  if (params.stage) searchParams.set('stage', params.stage);
  if (params.accountId) searchParams.set('accountId', params.accountId);
  if (params.repId) searchParams.set('repId', params.repId);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export function useOpportunities(
  params: UseOpportunitiesParams = {},
): ReturnType<typeof useQuery<OpportunityListApiResponse>> {
  return useQuery<OpportunityListApiResponse>({
    queryKey: ['opportunities', params],
    queryFn: async () => {
      const response = await apiClient<OpportunityListApiResponse>(
        `/api/opportunities${buildQueryString(params)}`,
      );
      return response;
    },
  });
}

export interface PipelineStageSummary {
  opportunities: OpportunityResponse[];
  count: number;
  totalValue: number;
}

export interface PipelineSummaryApiResponse {
  data: {
    stages: Record<string, PipelineStageSummary>;
    forecast: {
      weightedTotal: number;
      totalOpenValue: number;
      opportunityCount: number;
    };
  };
}

export function usePipelineSummary(): ReturnType<typeof useQuery<PipelineSummaryApiResponse>> {
  return useQuery<PipelineSummaryApiResponse>({
    queryKey: ['pipeline-summary'],
    queryFn: async () => {
      const response = await apiClient<PipelineSummaryApiResponse>('/api/pipeline/summary');
      return response;
    },
  });
}

export interface TransitionInput {
  opportunityId: string;
  stage: PipelineStage;
  closeReason?: string;
}

export function useTransitionOpportunity(): ReturnType<
  typeof useMutation<{ data: OpportunityResponse }, Error, TransitionInput>
> {
  const queryClient = useQueryClient();

  return useMutation<{ data: OpportunityResponse }, Error, TransitionInput>({
    mutationFn: async ({ opportunityId, stage, closeReason }) => {
      const response = await apiClient<{ data: OpportunityResponse }>(
        `/api/opportunities/${opportunityId}/transition`,
        {
          method: 'POST',
          body: JSON.stringify({ stage, closeReason }),
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
