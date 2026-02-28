import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import AccountListPage from './page';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockUseAccounts = vi.fn();

vi.mock('@/hooks/use-accounts', () => ({
  useAccounts: (...args: unknown[]) => mockUseAccounts(...args),
}));

const mockAccounts = {
  data: [
    {
      id: '1',
      name: 'Pacific Bistro',
      accountType: 'restaurant',
      healthScore: 85,
      territory: { id: 't1', name: 'Portland' },
      assignedRep: { id: 'r1', firstName: 'Jane', lastName: 'Doe' },
    },
    {
      id: '2',
      name: 'Mountain Market',
      accountType: 'store',
      healthScore: 35,
      territory: { id: 't2', name: 'Seattle' },
      assignedRep: { id: 'r2', firstName: 'John', lastName: 'Smith' },
    },
  ],
  total: 2,
  page: 1,
  limit: 20,
};

describe('AccountListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-P004: renders heading and search input', () => {
    mockUseAccounts.mockReturnValue({
      data: mockAccounts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AccountListPage />);

    expect(screen.getByRole('heading', { name: /accounts/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search accounts/i)).toBeInTheDocument();
  });

  it('FR-P004: renders "Create Account" link pointing to /accounts/new', () => {
    mockUseAccounts.mockReturnValue({
      data: mockAccounts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AccountListPage />);

    const link = screen.getByRole('link', { name: /create account/i });
    expect(link).toHaveAttribute('href', '/accounts/new');
  });

  it('FR-P004: shows skeleton table when loading', () => {
    mockUseAccounts.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<AccountListPage />);

    const skeletons = screen.getAllByRole('status');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('FR-P004: shows error banner when request fails', () => {
    mockUseAccounts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Server error'),
      refetch: vi.fn(),
    });

    render(<AccountListPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Unable to load accounts')).toBeInTheDocument();
  });

  it('FR-P004: error banner retry button calls refetch', () => {
    const mockRefetch = vi.fn();
    mockUseAccounts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('fail'),
      refetch: mockRefetch,
    });

    render(<AccountListPage />);

    screen.getByText('Retry').click();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('FR-P004: shows empty state when no accounts exist', () => {
    mockUseAccounts.mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 20 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AccountListPage />);

    expect(screen.getByText('No accounts found')).toBeInTheDocument();
    expect(screen.getByText('Get started by creating your first account')).toBeInTheDocument();
  });

  it('FR-P004: shows different empty state message when search is active', async () => {
    mockUseAccounts.mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 20 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    const user = userEvent.setup();

    render(<AccountListPage />);

    await user.type(screen.getByPlaceholderText(/search accounts/i), 'nonexistent');

    expect(screen.getByText('No accounts found')).toBeInTheDocument();
    expect(screen.getByText('Try a different search term')).toBeInTheDocument();
  });

  it('FR-P004: renders account rows with all columns on success', () => {
    mockUseAccounts.mockReturnValue({
      data: mockAccounts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AccountListPage />);

    // Table headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Territory')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('Rep')).toBeInTheDocument();

    // Row data
    expect(screen.getByText('Pacific Bistro')).toBeInTheDocument();
    expect(screen.getByText('restaurant')).toBeInTheDocument();
    expect(screen.getByText('Portland')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();

    // Second row
    expect(screen.getByText('Mountain Market')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('FR-P004: account name links to account detail page', () => {
    mockUseAccounts.mockReturnValue({
      data: mockAccounts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AccountListPage />);

    const link = screen.getByRole('link', { name: 'Pacific Bistro' });
    expect(link).toHaveAttribute('href', '/accounts/1');
  });

  it('FR-P004: shows pagination info with account count', () => {
    mockUseAccounts.mockReturnValue({
      data: mockAccounts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AccountListPage />);

    expect(screen.getByText(/showing 2 of 2 accounts/i)).toBeInTheDocument();
  });

  it('FR-P004: Previous button is disabled on first page', () => {
    mockUseAccounts.mockReturnValue({
      data: mockAccounts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AccountListPage />);

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('FR-P004: Next button is disabled when fewer results than limit', () => {
    mockUseAccounts.mockReturnValue({
      data: mockAccounts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AccountListPage />);

    // data.data.length (2) < 20, so Next should be disabled
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('FR-P004: passes search and page params to useAccounts', async () => {
    mockUseAccounts.mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 20 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    const user = userEvent.setup();

    render(<AccountListPage />);

    // Initially called with page=1, search=''
    expect(mockUseAccounts).toHaveBeenCalledWith({ page: 1, limit: 20, search: '' });

    await user.type(screen.getByPlaceholderText(/search accounts/i), 'test');

    // After typing, search should update and page reset to 1
    expect(mockUseAccounts).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'test', page: 1 }),
    );
  });
});
