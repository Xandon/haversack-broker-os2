'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export interface BusinessRule {
  id: string;
  name: string;
  entityType: string;
  isActive: boolean;
  conditions: Record<string, unknown>[];
  actions: Record<string, unknown>[];
  updatedAt: string;
  createdAt: string;
}

interface BusinessRuleListResponse {
  data: BusinessRule[];
}

export function useBusinessRules() {
  return useQuery<BusinessRuleListResponse>({
    queryKey: ['business-rules'],
    queryFn: () => apiClient.get('/api/business-rules'),
  });
}

export function useToggleBusinessRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/api/business-rules/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-rules'] });
    },
  });
}
