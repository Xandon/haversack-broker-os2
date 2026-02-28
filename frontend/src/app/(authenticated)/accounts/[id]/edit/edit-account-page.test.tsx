import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EditAccountPage from './page';
import { useAccountDetail } from '@/hooks/use-account-detail';

const mockPush = vi.fn();
const mockRefetch = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ id: 'acc-123' })),
  useRouter: vi.fn(() => ({ push: mockPush })),
}));

const mockMutate = vi.fn();

vi.mock('@/hooks/use-account-detail', () => ({
  useAccountDetail: vi.fn(() => ({
    data: {
      data: {
        id: 'acc-123',
        name: 'Pacific Bistro',
        accountType: 'restaurant',
        streetAddress: '123 Main St',
        city: 'Portland',
        state: 'OR',
        zipCode: '97201',
        territoryId: 'ter-1',
        territory: { id: 'ter-1', name: 'Portland Metro' },
        parentAccountId: null,
        parentAccount: null,
        childAccounts: [],
        contacts: [],
        healthScore: 75,
        healthScoreCalculatedAt: null,
        healthScoreBreakdown: null,
        isActive: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        deletedAt: null,
      },
    },
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
  })),
  useUpdateAccount: vi.fn(() => ({
    mutate: mockMutate,
    isPending: false,
  })),
}));

vi.mock('@/hooks/use-territories', () => ({
  useTerritories: vi.fn(() => ({
    data: [
      { id: 'ter-1', name: 'Portland Metro', region: 'PNW' },
      { id: 'ter-2', name: 'Seattle', region: 'PNW' },
    ],
    isLoading: false,
  })),
}));

vi.mock('@/hooks/use-check-duplicates', () => ({
  useCheckDuplicates: vi.fn(() => ({
    mutate: vi.fn(),
    isIdle: true,
    data: null,
  })),
}));

function renderWithProviders(ui: React.ReactElement): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('FR-035b: EditAccountPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-035b: renders edit page with breadcrumbs', () => {
    renderWithProviders(<EditAccountPage />);

    expect(screen.getByText('Edit Pacific Bistro')).toBeDefined();
    expect(screen.getByText('Accounts')).toBeDefined();
    expect(screen.getByText('Pacific Bistro')).toBeDefined();
    expect(screen.getByText('Edit')).toBeDefined();
  });

  test('FR-035b: pre-populates form with account data', () => {
    renderWithProviders(<EditAccountPage />);

    expect(screen.getByDisplayValue('Pacific Bistro')).toBeDefined();
    expect(screen.getByDisplayValue('123 Main St')).toBeDefined();
    expect(screen.getByDisplayValue('Portland')).toBeDefined();
    expect(screen.getByDisplayValue('OR')).toBeDefined();
    expect(screen.getByDisplayValue('97201')).toBeDefined();
  });

  test('FR-035b: shows Save Changes button in edit mode', () => {
    renderWithProviders(<EditAccountPage />);

    expect(screen.getByText('Save Changes')).toBeDefined();
    expect(screen.queryByText('Create Account')).toBeNull();
  });

  test('FR-035b: hides primary contact section in edit mode', () => {
    renderWithProviders(<EditAccountPage />);

    expect(screen.queryByText('Primary Contact')).toBeNull();
  });

  test('FR-035e: navigates back to account detail on cancel', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EditAccountPage />);

    await user.click(screen.getByText('Cancel'));
    expect(mockPush).toHaveBeenCalledWith('/accounts/acc-123');
  });

  test('FR-035b: renders error state when account fails to load', () => {
    vi.mocked(useAccountDetail).mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    } as ReturnType<typeof useAccountDetail>);

    renderWithProviders(<EditAccountPage />);

    expect(screen.getByText('Failed to load account')).toBeDefined();
  });

  test('FR-035b: renders loading skeleton while account loads', () => {
    vi.mocked(useAccountDetail).mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useAccountDetail>);

    renderWithProviders(<EditAccountPage />);

    // When loading, the form should not be visible
    expect(screen.queryByText('Save Changes')).toBeNull();
    expect(screen.queryByText('Account Information')).toBeNull();
  });
});
