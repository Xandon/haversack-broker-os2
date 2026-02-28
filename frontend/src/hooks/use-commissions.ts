'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export interface Commission {
  id: string;
  repId: string;
  orderId: string;
  orderItemId: string;
  brandId: string;
  period: string;
  lineTotal: number;
  baseRate: number;
  territoryModifier: number;
  volumeTier?: string;
  volumeTierAdjustment: number;
  effectiveRate: number;
  amount: number;
  status: string;
  approvedById?: string;
  approvedAt?: string;
  exportedAt?: string;
  createdAt: string;
  rep?: { id: string; firstName: string; lastName: string };
  brand?: { id: string; name: string };
  order?: { id: string; orderNumber?: string };
}

interface CommissionListResponse {
  data: Commission[];
  total: number;
  page: number;
  limit: number;
}

export interface CommissionSummary {
  totalEarned: number;
  totalPending: number;
  totalApproved: number;
  ytdTotal: number;
  statementCount: number;
}

export interface PeriodStatement {
  period: string;
  repId: string;
  repName: string;
  lineItems: Commission[];
  totalAmount: number;
  status: string;
}

export function useCommissions(params?: {
  page?: number;
  limit?: number;
  repId?: string;
  period?: string;
  status?: string;
}) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  return useQuery<CommissionListResponse>({
    queryKey: ['commissions', params],
    queryFn: () => {
      const searchParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(params?.repId && { repId: params.repId }),
        ...(params?.period && { period: params.period }),
        ...(params?.status && { status: params.status }),
      });
      return apiClient.get(`/api/commissions?${searchParams}`);
    },
  });
}

export function useCommissionSummary(repId?: string) {
  return useQuery<CommissionSummary>({
    queryKey: ['commissions', 'summary', repId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (repId) params.set('repId', repId);
      const qs = params.toString();
      return apiClient.get(`/api/commissions/summary${qs ? `?${qs}` : ''}`);
    },
  });
}

export function useCommissionStatement(repId: string, period: string) {
  return useQuery<PeriodStatement>({
    queryKey: ['commissions', 'statement', repId, period],
    queryFn: () => {
      const params = new URLSearchParams({ repId, period });
      return apiClient.get(`/api/commissions/statement?${params}`);
    },
    enabled: !!repId && !!period,
  });
}

export function useApproveCommission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/api/commissions/${id}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    },
  });
}

export function useDisputeCommission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/api/commissions/${id}/dispute`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    },
  });
}

export function useApproveStatement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { repId: string; period: string }) =>
      apiClient.patch('/api/commissions/statement/approve', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    },
  });
}
