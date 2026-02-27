import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

vi.mock('@/hooks/use-dashboard', () => ({
  useCriticalAccounts: vi.fn(),
}));

import { CriticalAccountsList } from './critical-accounts-list';

function createWrapper(): ({ children }: { children: ReactNode }) => React.ReactElement {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }): React.ReactElement {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('CriticalAccountsList', () => {
  it('renders loading skeleton', async () => {
    const { useCriticalAccounts } = await import('@/hooks/use-dashboard');
    (useCriticalAccounts as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { container } = render(<CriticalAccountsList />, { wrapper: createWrapper() });
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders empty state message', async () => {
    const { useCriticalAccounts } = await import('@/hooks/use-dashboard');
    (useCriticalAccounts as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<CriticalAccountsList />, { wrapper: createWrapper() });
    expect(screen.getByText('No critical accounts')).toBeDefined();
  });

  it('renders accounts in semantic table', async () => {
    const { useCriticalAccounts } = await import('@/hooks/use-dashboard');
    (useCriticalAccounts as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        { id: '1', name: 'Pacific Bistro', healthScore: 15, territory: 'Portland' },
        { id: '2', name: 'Mountain Deli', healthScore: 22, territory: 'Seattle' },
      ],
      isLoading: false,
    });

    render(<CriticalAccountsList />, { wrapper: createWrapper() });
    expect(screen.getByText('Pacific Bistro')).toBeDefined();
    expect(screen.getByText('Mountain Deli')).toBeDefined();

    // Verify semantic table structure
    const table = screen.getByRole('table');
    expect(table).toBeDefined();
    const headers = screen.getAllByRole('columnheader');
    expect(headers.length).toBe(3);
  });
});
