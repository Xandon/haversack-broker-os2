import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import CommissionDashboardPage from './page';

vi.mock('@/hooks/use-commissions', () => ({
  useCommissions: vi.fn(),
  useCommissionSummary: vi.fn(),
}));

vi.mock('@/components/commissions/commission-summary-card', () => ({
  CommissionSummaryCard: ({ summary }: { summary: unknown }) => (
    <div data-testid="commission-summary-card">{JSON.stringify(summary)}</div>
  ),
}));

vi.mock('@/components/commissions/commission-line-item-table', () => ({
  CommissionLineItemTable: ({ lineItems }: { lineItems: unknown[] }) => (
    <div data-testid="commission-line-item-table">Items: {lineItems.length}</div>
  ),
}));

import { useCommissions, useCommissionSummary } from '@/hooks/use-commissions';

const mockUseCommissions = vi.mocked(useCommissions);
const mockUseCommissionSummary = vi.mocked(useCommissionSummary);

const mockSummary = {
  totalEarned: 8000,
  totalPending: 2000,
  totalApproved: 5500,
  ytdTotal: 65000,
  statementCount: 6,
};

const mockCommissionsList = {
  data: [
    {
      id: 'c1',
      repId: 'r1',
      orderId: 'o1',
      orderItemId: 'oi1',
      brandId: 'b1',
      period: '2026-02',
      lineTotal: 5000,
      baseRate: 12,
      territoryModifier: 0,
      volumeTierAdjustment: 0,
      effectiveRate: 12,
      amount: 600,
      status: 'pending',
      createdAt: '2026-02-01',
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
};

describe('CommissionDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-P012: renders "Commissions" heading with period and status filters', () => {
    mockUseCommissionSummary.mockReturnValue({
      data: mockSummary,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissionSummary>);
    mockUseCommissions.mockReturnValue({
      data: mockCommissionsList,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissions>);

    render(<CommissionDashboardPage />);

    expect(screen.getByText('Commissions')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('FR-P012: shows skeleton card and skeleton table when loading', () => {
    mockUseCommissionSummary.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissionSummary>);
    mockUseCommissions.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissions>);

    render(<CommissionDashboardPage />);

    const skeletons = screen.getAllByRole('status');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('FR-P012: shows error banner when summaryError occurs', () => {
    mockUseCommissionSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('summary fail'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissionSummary>);
    mockUseCommissions.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissions>);

    render(<CommissionDashboardPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Unable to load commissions')).toBeInTheDocument();
  });

  it('FR-P012: shows error banner when listError occurs', () => {
    mockUseCommissionSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissionSummary>);
    mockUseCommissions.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('list fail'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissions>);

    render(<CommissionDashboardPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Unable to load commissions')).toBeInTheDocument();
  });

  it('FR-P012: shows empty state when no commissions exist', () => {
    mockUseCommissionSummary.mockReturnValue({
      data: mockSummary,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissionSummary>);
    mockUseCommissions.mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 20 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissions>);

    render(<CommissionDashboardPage />);

    expect(screen.getByText('No commissions for this period')).toBeInTheDocument();
    expect(
      screen.getByText('Commissions will appear here when orders are processed'),
    ).toBeInTheDocument();
  });

  it('FR-P012: renders summary card and line item table on success', () => {
    mockUseCommissionSummary.mockReturnValue({
      data: mockSummary,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissionSummary>);
    mockUseCommissions.mockReturnValue({
      data: mockCommissionsList,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissions>);

    render(<CommissionDashboardPage />);

    expect(screen.getByTestId('commission-summary-card')).toBeInTheDocument();
    expect(screen.getByTestId('commission-line-item-table')).toBeInTheDocument();
  });
});
