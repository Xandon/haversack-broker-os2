import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { TimelineTab } from './timeline-tab';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from '@/lib/api-client';

const mockApiClient = vi.mocked(apiClient);

function createWrapper(): React.ComponentType<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const MOCK_TIMELINE = {
  data: [
    {
      id: 'act-1',
      type: 'activity',
      occurredAt: '2026-02-26T14:00:00Z',
      data: {
        type: 'visit',
        notes: 'Met with purchasing team about new products',
        durationMinutes: 45,
        user: { id: 'user-1', firstName: 'Jane', lastName: 'Doe' },
      },
    },
    {
      id: 'task-1',
      type: 'task',
      occurredAt: '2026-02-25T09:00:00Z',
      data: {
        title: 'Follow up on Q2 pricing',
        status: 'pending',
        priority: 'high',
        assignee: { id: 'user-1', firstName: 'Jane', lastName: 'Doe' },
      },
    },
  ],
  pagination: { cursor: null, hasMore: false, total: 2 },
  counts: { activity: 1, email: 0, task: 1 },
};

describe('FR-002: TimelineTab component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-002: renders timeline items after loading', async () => {
    mockApiClient.mockResolvedValue(MOCK_TIMELINE);

    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(TimelineTab, { accountId: 'acc-1' }),
      ),
    );

    // Wait for data to load
    const notes = await screen.findByText('Met with purchasing team about new products');
    expect(notes).toBeDefined();
  });

  test('FR-002: renders task items in timeline', async () => {
    mockApiClient.mockResolvedValue(MOCK_TIMELINE);

    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(TimelineTab, { accountId: 'acc-1' }),
      ),
    );

    const taskTitle = await screen.findByText('Follow up on Q2 pricing');
    expect(taskTitle).toBeDefined();
  });

  test('FR-002: shows total count', async () => {
    mockApiClient.mockResolvedValue(MOCK_TIMELINE);

    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(TimelineTab, { accountId: 'acc-1' }),
      ),
    );

    const count = await screen.findByText('2 timeline items');
    expect(count).toBeDefined();
  });

  test('FR-002: shows empty state when no items', async () => {
    mockApiClient.mockResolvedValue({
      data: [],
      pagination: { cursor: null, hasMore: false, total: 0 },
      counts: { activity: 0, email: 0, task: 0 },
    });

    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(TimelineTab, { accountId: 'acc-1' }),
      ),
    );

    const emptyState = await screen.findByText('No timeline activity');
    expect(emptyState).toBeDefined();
  });

  test('AC-051a: renders email engagement badge on email timeline items', async () => {
    const emailTimeline = {
      data: [
        {
          id: 'email-1',
          type: 'email',
          occurredAt: '2026-02-28T10:00:00Z',
          data: {
            subject: 'Product samples follow-up',
            recipientEmail: 'buyer@store.com',
            status: 'opened',
            openedAt: '2026-02-28T11:00:00Z',
          },
        },
      ],
      pagination: { cursor: null, hasMore: false, total: 1 },
      counts: { activity: 0, email: 1, task: 0 },
    };
    mockApiClient.mockResolvedValue(emailTimeline);

    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(TimelineTab, { accountId: 'acc-1' }),
      ),
    );

    const subject = await screen.findByText('Product samples follow-up');
    expect(subject).toBeDefined();

    expect(screen.getByText('To: buyer@store.com')).toBeDefined();
    expect(screen.getByTestId('engagement-badge')).toBeDefined();
    expect(screen.getByText('Opened')).toBeDefined();
  });

  test('FR-002: renders activity type filter dropdown', async () => {
    mockApiClient.mockResolvedValue(MOCK_TIMELINE);

    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(TimelineTab, { accountId: 'acc-1' }),
      ),
    );

    // Wait for render then check filter exists
    await screen.findByText('2 timeline items');
    expect(screen.getByText('All Types')).toBeDefined();
  });
});
