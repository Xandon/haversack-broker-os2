'use client';

import type {
  CreateOpportunityInput,
  UpdateOpportunityInput,
  UpdateOpportunityStageInput,
} from '@haversack/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export interface Opportunity {
  id: string;
  name: string;
  accountId: string;
  assignedRepId: string;
  stage: string;
  probability: number;
  estimatedValue: number;
  weightedValue: number;
  closeDate: string;
  closeReason?: string;
  notes?: string;
  associatedBrandIds: string[];
  createdAt: string;
  updatedAt: string;
  account?: { id: string; name: string };
  assignedRep?: { id: string; firstName: string; lastName: string };
}

interface OpportunityListResponse {
  data: Opportunity[];
  total: number;
  page: number;
  limit: number;
}

interface OpportunityResponse {
  data: Opportunity;
}

interface PipelineStageData {
  opportunities: Opportunity[];
  count: number;
  totalValue: number;
  weightedValue: number;
}

export interface PipelineResponse {
  stages: Record<string, PipelineStageData>;
  summary: {
    totalOpportunities: number;
    totalWeightedForecast: number;
  };
}

export function useOpportunities(params?: {
  page?: number;
  limit?: number;
  search?: string;
  stage?: string;
  assignedRepId?: string;
  accountId?: string;
}) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const search = params?.search ?? '';

  return useQuery<OpportunityListResponse>({
    queryKey: ['opportunities', { page, limit, search, ...params }],
    queryFn: () => {
      const searchParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(params?.stage && { stage: params.stage }),
        ...(params?.assignedRepId && { assignedRepId: params.assignedRepId }),
        ...(params?.accountId && { accountId: params.accountId }),
      });
      return apiClient.get(`/api/opportunities?${searchParams}`);
    },
  });
}

export function useOpportunity(id: string) {
  return useQuery<OpportunityResponse>({
    queryKey: ['opportunities', id],
    queryFn: () => apiClient.get(`/api/opportunities/${id}`),
    enabled: !!id,
  });
}

export function usePipeline(assignedRepId?: string) {
  return useQuery<PipelineResponse>({
    queryKey: ['pipeline', { assignedRepId }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (assignedRepId) params.set('assignedRepId', assignedRepId);
      const qs = params.toString();
      return apiClient.get(`/api/pipeline${qs ? `?${qs}` : ''}`);
    },
  });
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOpportunityInput) =>
      apiClient.post<OpportunityResponse>('/api/opportunities', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}

export function useUpdateOpportunity(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOpportunityInput) =>
      apiClient.patch<OpportunityResponse>(`/api/opportunities/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities', id] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}

export function useUpdateOpportunityStage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOpportunityStageInput) =>
      apiClient.patch<OpportunityResponse>(`/api/opportunities/${id}/stage`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities', id] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}

export function useDeleteOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/opportunities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}
