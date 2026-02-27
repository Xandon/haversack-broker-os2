import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement } from 'react';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

import { useBusinessRules, useBusinessRule, isConditionGroup } from './use-business-rules';

function createWrapper(): ({ children }: { children: ReactNode }) => React.ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): React.ReactElement {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const mockRule = {
  id: 'rule-1',
  tenantId: 't1',
  name: 'Test Rule',
  description: null,
  entityType: 'Account',
  conditions: { logic: 'AND' as const, conditions: [{ field: 'healthScore', operator: 'lt', value: 30 }] },
  actions: [{ type: 'send_notification' as const, config: { recipient: 'assignedRep', title: 'Alert' } }],
  priority: 100,
  status: 'active' as const,
  lastFiredAt: null,
  errorMessage: null,
  createdBy: 'user-1',
  createdAt: '2026-02-27T00:00:00Z',
  updatedAt: '2026-02-27T00:00:00Z',
};

describe('useBusinessRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches list of rules', async () => {
    const { apiClient } = await import('@/lib/api-client');
    (apiClient as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: [mockRule] });

    const { result } = renderHook(() => useBusinessRules(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe('Test Rule');
  });

  it('applies status filter', async () => {
    const { apiClient } = await import('@/lib/api-client');
    (apiClient as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: [] });

    renderHook(() => useBusinessRules({ status: 'active' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith('/api/business-rules?status=active');
    });
  });
});

describe('useBusinessRule', () => {
  it('fetches single rule by id', async () => {
    const { apiClient } = await import('@/lib/api-client');
    (apiClient as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockRule });

    const { result } = renderHook(() => useBusinessRule('rule-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe('Test Rule');
  });
});

describe('isConditionGroup', () => {
  it('returns true for condition groups', () => {
    expect(isConditionGroup({ logic: 'AND', conditions: [] })).toBe(true);
  });

  it('returns false for simple conditions', () => {
    expect(isConditionGroup({ field: 'name', operator: 'eq', value: 'test' })).toBe(false);
  });
});
