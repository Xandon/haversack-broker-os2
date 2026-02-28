import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { TaskFormDialog } from './task-form-dialog';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

function createWrapper(): React.ComponentType<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const MOCK_ACCOUNTS = [
  { id: 'acc-1', name: 'Pacific Bistro' },
  { id: 'acc-2', name: 'Mountain Deli' },
];

const MOCK_USERS = [
  { id: 'user-1', name: 'Riley Rep' },
  { id: 'user-2', name: 'Sam Sales' },
];

describe('FR-037: TaskFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-037: renders dialog title when open', () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(TaskFormDialog, {
          open: true,
          onOpenChange: vi.fn(),
          accounts: MOCK_ACCOUNTS,
          users: MOCK_USERS,
        }),
      ),
    );

    expect(screen.getByText('New Task')).toBeDefined();
  });

  test('FR-037: renders all form fields', () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(TaskFormDialog, {
          open: true,
          onOpenChange: vi.fn(),
          accounts: MOCK_ACCOUNTS,
          users: MOCK_USERS,
        }),
      ),
    );

    expect(screen.getByLabelText('Title')).toBeDefined();
    expect(screen.getByLabelText('Description')).toBeDefined();
    expect(screen.getByLabelText('Due Date')).toBeDefined();
    expect(screen.getByLabelText('Priority')).toBeDefined();
    expect(screen.getByLabelText('Assignee')).toBeDefined();
  });

  test('FR-037: shows Edit Task title when task is provided', () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(TaskFormDialog, {
          open: true,
          onOpenChange: vi.fn(),
          accounts: MOCK_ACCOUNTS,
          users: MOCK_USERS,
          task: {
            id: 'task-1',
            title: 'Follow up',
            description: 'Check status',
            dueDate: '2026-03-01T10:00:00.000Z',
            priority: 'high',
            status: 'pending',
            assigneeId: 'user-1',
            accountId: 'acc-1',
          },
        }),
      ),
    );

    expect(screen.getByText('Edit Task')).toBeDefined();
  });

  test('FR-037: shows validation error for empty title on submit', async () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(TaskFormDialog, {
          open: true,
          onOpenChange: vi.fn(),
          accounts: MOCK_ACCOUNTS,
          users: MOCK_USERS,
        }),
      ),
    );

    const submitBtn = screen.getByText('Save');
    fireEvent.click(submitBtn);

    const error = await screen.findByText('Title is required');
    expect(error).toBeDefined();
  });

  test('FR-037: renders account selector with options', () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(TaskFormDialog, {
          open: true,
          onOpenChange: vi.fn(),
          accounts: MOCK_ACCOUNTS,
          users: MOCK_USERS,
        }),
      ),
    );

    expect(screen.getByText('Pacific Bistro')).toBeDefined();
    expect(screen.getByText('Mountain Deli')).toBeDefined();
  });

  test('FR-037: renders Cancel button', () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(TaskFormDialog, {
          open: true,
          onOpenChange: vi.fn(),
          accounts: MOCK_ACCOUNTS,
          users: MOCK_USERS,
        }),
      ),
    );

    expect(screen.getByText('Cancel')).toBeDefined();
  });

  test('FR-037: does not render when closed', () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(TaskFormDialog, {
          open: false,
          onOpenChange: vi.fn(),
          accounts: MOCK_ACCOUNTS,
          users: MOCK_USERS,
        }),
      ),
    );

    expect(screen.queryByText('New Task')).toBeNull();
  });
});
