import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { useMeetingBrief, useEmailDraft, useActivitySummary } from './use-ai';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from '@/lib/api-client';

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('FR-047: useMeetingBrief', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-047: calls POST /api/ai/meeting-brief with account_id', async () => {
    const mockResponse = {
      account_id: 'acc-1',
      account_name: 'Coffee Co',
      ai_generated: true,
      ai_label: 'AI-Generated',
      brief: {
        key_contacts: [],
        activity_summary: 'Active account',
        order_trends: {
          total_orders_12m: 5,
          total_revenue_12m: 10000,
          average_order_value: 2000,
          trend: 'stable',
          top_products: [],
        },
        talking_points: ['Point 1'],
        health_score: 75,
        health_trend: 'stable',
      },
      editable: true,
      generated_at: '2026-02-28T00:00:00Z',
    };
    vi.mocked(apiClient).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useMeetingBrief(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ accountId: 'acc-1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient).toHaveBeenCalledWith('/api/ai/meeting-brief', {
      method: 'POST',
      body: JSON.stringify({ account_id: 'acc-1' }),
    });
    expect(result.current.data?.brief.talking_points).toEqual(['Point 1']);
  });

  test('FR-047: handles meeting brief error', async () => {
    vi.mocked(apiClient).mockRejectedValue(new Error('AI unavailable'));

    const { result } = renderHook(() => useMeetingBrief(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ accountId: 'acc-1' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('AI unavailable');
  });
});

describe('FR-047: useEmailDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-047: calls POST /api/ai/email-draft with required fields', async () => {
    const mockResponse = {
      ai_generated: true,
      ai_label: 'AI-Generated',
      draft: {
        to_email: 'john@coffee.com',
        to_name: 'John Doe',
        subject: 'Follow up',
        body: 'Hello John...',
        suggested_send_time: null,
      },
      editable: true,
      generated_at: '2026-02-28T00:00:00Z',
    };
    vi.mocked(apiClient).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useEmailDraft(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      accountId: 'acc-1',
      contactId: 'con-1',
      purpose: 'follow_up',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient).toHaveBeenCalledWith('/api/ai/email-draft', {
      method: 'POST',
      body: JSON.stringify({
        account_id: 'acc-1',
        contact_id: 'con-1',
        purpose: 'follow_up',
        context: undefined,
        product_ids: undefined,
        tone: undefined,
      }),
    });
    expect(result.current.data?.draft.subject).toBe('Follow up');
  });

  test('FR-047: handles email draft error', async () => {
    vi.mocked(apiClient).mockRejectedValue(new Error('Service unavailable'));

    const { result } = renderHook(() => useEmailDraft(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      accountId: 'acc-1',
      contactId: 'con-1',
      purpose: 'introduction',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('FR-047: useActivitySummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-047: calls POST /api/ai/activity-summary', async () => {
    const mockResponse = {
      account_id: 'acc-1',
      account_name: 'Coffee Co',
      ai_generated: true,
      ai_label: 'AI-Generated',
      summary: {
        period: 'Aug 2025 — Feb 2026',
        total_activities: 12,
        activity_breakdown: { visits: 3, calls: 5, emails: 3, demos: 1 },
        narrative: 'Active engagement over the past 6 months.',
        key_events: ['Product demo in October'],
        engagement_assessment: 'High engagement',
      },
      editable: true,
      generated_at: '2026-02-28T00:00:00Z',
    };
    vi.mocked(apiClient).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useActivitySummary(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ accountId: 'acc-1', periodMonths: 6 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient).toHaveBeenCalledWith('/api/ai/activity-summary', {
      method: 'POST',
      body: JSON.stringify({ account_id: 'acc-1', period_months: 6 }),
    });
    expect(result.current.data?.summary.total_activities).toBe(12);
  });

  test('FR-047: handles activity summary error', async () => {
    vi.mocked(apiClient).mockRejectedValue(new Error('Timeout'));

    const { result } = renderHook(() => useActivitySummary(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ accountId: 'acc-1' });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
