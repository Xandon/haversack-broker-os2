import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/tasks',
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from '@/lib/api-client';

const mockApiClient = vi.mocked(apiClient);

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let TasksPage: typeof import('@/app/(authenticated)/tasks/page').default;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import('@/app/(authenticated)/tasks/page');
  TasksPage = mod.default;
});

const MOCK_TASKS = {
  data: [
    {
      id: 'task-1',
      tenantId: 'tenant-1',
      title: 'Follow up with Pacific Bistro',
      description: 'Check on sample order status',
      dueDate: '2026-03-01T10:00:00.000Z',
      priority: 'high',
      status: 'pending',
      assigneeId: 'user-1',
      creatorId: 'user-1',
      accountId: 'acc-1',
      contactId: null,
      completedAt: null,
      isOverdue: false,
      createdAt: '2026-02-26T10:00:00Z',
      updatedAt: '2026-02-26T10:00:00Z',
    },
    {
      id: 'task-2',
      tenantId: 'tenant-1',
      title: 'Prepare demo materials',
      description: null,
      dueDate: '2026-02-25T10:00:00.000Z',
      priority: 'medium',
      status: 'pending',
      assigneeId: 'user-1',
      creatorId: 'user-1',
      accountId: null,
      contactId: null,
      completedAt: null,
      isOverdue: true,
      createdAt: '2026-02-20T10:00:00Z',
      updatedAt: '2026-02-20T10:00:00Z',
    },
  ],
  pagination: { cursor: null, hasMore: false, total: 2 },
};

const EMPTY_TASKS = {
  data: [],
  pagination: { cursor: null, hasMore: false, total: 0 },
};

function createWrapper(): React.ComponentType<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('FR-037: TasksPage', () => {
  test('FR-037: renders page header with title Tasks', async () => {
    mockApiClient.mockResolvedValue(MOCK_TASKS);

    const Wrapper = createWrapper();
    render(createElement(Wrapper, null, createElement(TasksPage)));

    const header = await screen.findByText('Tasks');
    expect(header).toBeDefined();
  });

  test('FR-037: renders task data in the table', async () => {
    mockApiClient.mockResolvedValue(MOCK_TASKS);

    const Wrapper = createWrapper();
    render(createElement(Wrapper, null, createElement(TasksPage)));

    const title = await screen.findByText('Follow up with Pacific Bistro');
    expect(title).toBeDefined();
    expect(screen.getByText('Prepare demo materials')).toBeDefined();
  });

  test('FR-037: shows total count of tasks', async () => {
    mockApiClient.mockResolvedValue(MOCK_TASKS);

    const Wrapper = createWrapper();
    render(createElement(Wrapper, null, createElement(TasksPage)));

    const count = await screen.findByText('Showing 2 of 2 tasks');
    expect(count).toBeDefined();
  });

  test('FR-037: shows empty state when no tasks', async () => {
    mockApiClient.mockResolvedValue(EMPTY_TASKS);

    const Wrapper = createWrapper();
    render(createElement(Wrapper, null, createElement(TasksPage)));

    const emptyState = await screen.findByText('No tasks found');
    expect(emptyState).toBeDefined();
  });

  test('FR-037: shows error state on API failure', async () => {
    mockApiClient.mockRejectedValue(new Error('Network error'));

    const Wrapper = createWrapper();
    render(createElement(Wrapper, null, createElement(TasksPage)));

    const errorState = await screen.findByText('Failed to load tasks');
    expect(errorState).toBeDefined();
  });
});
