import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface CommissionEntryResponse {
  id: string;
  orderId: string;
  orderNumber: string;
  orderLineItemId: string;
  accountName: string;
  brandName: string;
  entryType: 'calculation' | 'reversal' | 'credit';
  baseRate: number;
  territoryModifier: number;
  volumeTierApplied: string;
  effectiveRate: number;
  lineItemTotal: number;
  commissionAmount: number;
  calculatedAt: string;
  disputeStatus: 'open' | 'resolved' | null;
}

export interface CommissionDisputeResponse {
  id: string;
  statementId: string;
  commissionEntryId: string;
  filedBy: string;
  filerName: string;
  reason: string;
  status: 'open' | 'resolved';
  originalAmount: number;
  adjustedAmount: number | null;
  resolvedBy: string | null;
  resolverName: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
}

export type CommissionStatementStatus = 'pending' | 'approved' | 'exported' | 'paid';

export interface CommissionStatementResponse {
  id: string;
  repId: string;
  repName: string;
  month: number;
  year: number;
  status: CommissionStatementStatus;
  totalEarned: number;
  ytdTotal: number;
  entries?: CommissionEntryResponse[];
  disputes?: CommissionDisputeResponse[];
  approvedBy: string | null;
  approvedAt: string | null;
  exportedAt: string | null;
  createdAt: string;
}

export interface CommissionRuleResponse {
  id: string;
  brandId: string;
  brandName: string;
  territoryId: string | null;
  territoryName: string | null;
  baseRate: number;
  territoryModifier: number;
  volumeTiers: { minAmount: number; maxAmount: number | null; bonusRate: number }[];
  effectiveDate: string;
  expiresAt: string | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface UseStatementsParams {
  repId?: string;
  month?: number;
  year?: number;
  status?: string;
  cursor?: string;
  limit?: number;
}

function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export function useCommissionStatements(
  params: UseStatementsParams = {},
): ReturnType<typeof useQuery<{ data: CommissionStatementResponse[]; pagination: { cursor: string | null; hasMore: boolean; total: number } }>> {
  return useQuery({
    queryKey: ['commission-statements', params],
    queryFn: async () => {
      const response = await apiClient<{ data: CommissionStatementResponse[]; pagination: { cursor: string | null; hasMore: boolean; total: number } }>(
        `/api/commissions/statements${buildQueryString(params)}`,
      );
      return response;
    },
  });
}

export function useCommissionStatement(
  statementId: string | undefined,
): ReturnType<typeof useQuery<{ data: CommissionStatementResponse }>> {
  return useQuery({
    queryKey: ['commission-statements', statementId],
    queryFn: async () => {
      const response = await apiClient<{ data: CommissionStatementResponse }>(
        `/api/commissions/statements/${statementId}`,
      );
      return response;
    },
    enabled: Boolean(statementId),
  });
}

export function useApproveStatement(): ReturnType<
  typeof useMutation<{ data: CommissionStatementResponse }, Error, string>
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (statementId: string) => {
      const response = await apiClient<{ data: CommissionStatementResponse }>(
        `/api/commissions/statements/${statementId}/approve`,
        { method: 'POST' },
      );
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['commission-statements'] });
    },
  });
}

export function useRejectStatement(): ReturnType<
  typeof useMutation<{ data: CommissionStatementResponse }, Error, { statementId: string; reason: string }>
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ statementId, reason }) => {
      const response = await apiClient<{ data: CommissionStatementResponse }>(
        `/api/commissions/statements/${statementId}/reject`,
        { method: 'POST', body: JSON.stringify({ reason }) },
      );
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['commission-statements'] });
    },
  });
}

export function useExportCommissions(): ReturnType<
  typeof useMutation<{ data: { csv: string; statementsIncluded: number; totalAmount: number } }, Error, { month: number; year: number }>
> {
  return useMutation({
    mutationFn: async ({ month, year }) => {
      const response = await apiClient<{ data: { csv: string; statementsIncluded: number; totalAmount: number } }>(
        '/api/commissions/export',
        { method: 'POST', body: JSON.stringify({ month, year }) },
      );
      return response;
    },
  });
}

export interface UseRulesParams {
  brandId?: string;
  territoryId?: string;
  activeOnly?: boolean;
  cursor?: string;
  limit?: number;
}

export function useCommissionRules(
  params: UseRulesParams = {},
): ReturnType<typeof useQuery<{ data: CommissionRuleResponse[]; pagination: { cursor: string | null; hasMore: boolean; total: number } }>> {
  return useQuery({
    queryKey: ['commission-rules', params],
    queryFn: async () => {
      const response = await apiClient<{ data: CommissionRuleResponse[]; pagination: { cursor: string | null; hasMore: boolean; total: number } }>(
        `/api/commissions/rules${buildQueryString(params as Record<string, string | number | boolean | undefined>)}`,
      );
      return response;
    },
  });
}
