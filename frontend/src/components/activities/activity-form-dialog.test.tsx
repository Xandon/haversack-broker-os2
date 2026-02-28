import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { ActivityFormDialog } from './activity-form-dialog';

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

describe('FR-036: ActivityFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-036: renders dialog title when open', () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(ActivityFormDialog, {
          open: true,
          onOpenChange: vi.fn(),
          accounts: MOCK_ACCOUNTS,
        }),
      ),
    );

    expect(screen.getByText('Record a new activity for an account.')).toBeDefined();
  });

  test('FR-036: renders account selector with options', () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(ActivityFormDialog, {
          open: true,
          onOpenChange: vi.fn(),
          accounts: MOCK_ACCOUNTS,
        }),
      ),
    );

    expect(screen.getByText('Pacific Bistro')).toBeDefined();
    expect(screen.getByText('Mountain Deli')).toBeDefined();
  });

  test('FR-036: renders activity type selector', () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(ActivityFormDialog, {
          open: true,
          onOpenChange: vi.fn(),
          accounts: MOCK_ACCOUNTS,
        }),
      ),
    );

    expect(screen.getByLabelText('Type')).toBeDefined();
  });

  test('FR-036: renders date/time and duration fields', () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(ActivityFormDialog, {
          open: true,
          onOpenChange: vi.fn(),
          accounts: MOCK_ACCOUNTS,
        }),
      ),
    );

    expect(screen.getByLabelText('Date & Time')).toBeDefined();
    expect(screen.getByLabelText('Duration (min)')).toBeDefined();
  });

  test('FR-036: renders notes textarea', () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(ActivityFormDialog, {
          open: true,
          onOpenChange: vi.fn(),
          accounts: MOCK_ACCOUNTS,
        }),
      ),
    );

    expect(screen.getByLabelText('Notes')).toBeDefined();
  });

  test('FR-036: renders Log Activity submit button', () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(ActivityFormDialog, {
          open: true,
          onOpenChange: vi.fn(),
          accounts: MOCK_ACCOUNTS,
        }),
      ),
    );

    const buttons = screen.getAllByText('Log Activity');
    // Should have at least the submit button
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  test('FR-036: does not render when closed', () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(ActivityFormDialog, {
          open: false,
          onOpenChange: vi.fn(),
          accounts: MOCK_ACCOUNTS,
        }),
      ),
    );

    expect(screen.queryByText('Record a new activity for an account.')).toBeNull();
  });
});
