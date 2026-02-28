import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { AccountFilters } from './account-filters';

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockPush }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/accounts',
}));

// Mock useTerritories
vi.mock('@/hooks/use-territories', () => ({
  useTerritories: () => ({
    data: [
      { id: 'ter-1', name: 'Portland Metro', region: 'Oregon' },
      { id: 'ter-2', name: 'Seattle Area', region: 'Washington' },
    ],
    isLoading: false,
    isError: false,
  }),
}));

function createWrapper(): React.ComponentType<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('FR-033c: AccountFilters component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-033c: renders territory filter dropdown', () => {
    render(<AccountFilters onFiltersChange={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByLabelText('Territory')).toBeDefined();
  });

  test('FR-033c: renders account type filter dropdown', () => {
    render(<AccountFilters onFiltersChange={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByLabelText('Type')).toBeDefined();
  });

  test('FR-033c: renders health score preset buttons', () => {
    render(<AccountFilters onFiltersChange={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('All')).toBeDefined();
    expect(screen.getByText('Healthy')).toBeDefined();
    expect(screen.getByText('At Risk')).toBeDefined();
  });

  test('FR-033i: renders search input', () => {
    render(<AccountFilters onFiltersChange={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByPlaceholderText(/search/i)).toBeDefined();
  });

  test('FR-033c: renders clear all button', () => {
    render(<AccountFilters onFiltersChange={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText(/clear/i)).toBeDefined();
  });

  test('FR-033c: calls onFiltersChange when health score preset clicked', async () => {
    const onFiltersChange = vi.fn();
    render(<AccountFilters onFiltersChange={onFiltersChange} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('At Risk'));

    await waitFor(() => {
      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          healthScoreMin: 0,
          healthScoreMax: 39,
        }),
      );
    });
  });

  test('FR-033c: calls onFiltersChange with empty values on clear', async () => {
    const onFiltersChange = vi.fn();
    render(<AccountFilters onFiltersChange={onFiltersChange} />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText(/clear/i));

    await waitFor(() => {
      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          territoryId: undefined,
          accountType: undefined,
          healthScoreMin: undefined,
          healthScoreMax: undefined,
          search: undefined,
        }),
      );
    });
  });
});
