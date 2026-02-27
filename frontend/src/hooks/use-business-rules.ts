import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface BusinessRule {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  entityType: string;
  conditions: ConditionGroup;
  actions: RuleAction[];
  priority: number;
  status: 'active' | 'inactive' | 'error';
  lastFiredAt: string | null;
  errorMessage: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; firstName: string; lastName: string };
}

export interface ConditionGroup {
  logic: 'AND' | 'OR';
  conditions: Array<Condition | ConditionGroup>;
}

export interface Condition {
  field: string;
  operator: string;
  value: unknown;
}

export interface RuleAction {
  type: 'send_notification' | 'update_field' | 'create_task' | 'send_email';
  config: Record<string, unknown>;
}

export interface CreateRuleInput {
  name: string;
  description?: string;
  entityType: string;
  conditions: ConditionGroup;
  actions: RuleAction[];
  priority?: number;
}

export interface UpdateRuleInput {
  name?: string;
  description?: string;
  conditions?: ConditionGroup;
  actions?: RuleAction[];
  priority?: number;
  status?: 'active' | 'inactive';
}

function isConditionGroup(item: Condition | ConditionGroup): item is ConditionGroup {
  return 'logic' in item;
}

export { isConditionGroup };

export function useBusinessRules(filters?: { status?: string; entityType?: string }): ReturnType<typeof useQuery<BusinessRule[]>> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.entityType) params.set('entityType', filters.entityType);
  const qs = params.toString();

  return useQuery<BusinessRule[]>({
    queryKey: ['business-rules', filters],
    queryFn: async () => {
      const response = await apiClient<{ data: BusinessRule[] }>(
        `/api/business-rules${qs ? `?${qs}` : ''}`,
      );
      return response.data;
    },
  });
}

export function useBusinessRule(id: string): ReturnType<typeof useQuery<BusinessRule>> {
  return useQuery<BusinessRule>({
    queryKey: ['business-rules', id],
    queryFn: async () => {
      const response = await apiClient<{ data: BusinessRule }>(
        `/api/business-rules/${id}`,
      );
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateRule(): ReturnType<typeof useMutation<BusinessRule, Error, CreateRuleInput>> {
  const queryClient = useQueryClient();

  return useMutation<BusinessRule, Error, CreateRuleInput>({
    mutationFn: async (input) => {
      const response = await apiClient<{ data: BusinessRule }>(
        '/api/business-rules',
        { method: 'POST', body: JSON.stringify(input) },
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['business-rules'] });
    },
  });
}

export function useUpdateRule(): ReturnType<typeof useMutation<BusinessRule, Error, { id: string; input: UpdateRuleInput }>> {
  const queryClient = useQueryClient();

  return useMutation<BusinessRule, Error, { id: string; input: UpdateRuleInput }>({
    mutationFn: async ({ id, input }) => {
      const response = await apiClient<{ data: BusinessRule }>(
        `/api/business-rules/${id}`,
        { method: 'PUT', body: JSON.stringify(input) },
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['business-rules'] });
    },
  });
}

export function useDeleteRule(): ReturnType<typeof useMutation<void, Error, string>> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient(`/api/business-rules/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['business-rules'] });
    },
  });
}
