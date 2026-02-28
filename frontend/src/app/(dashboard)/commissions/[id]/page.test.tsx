import { render, screen } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import CommissionStatementDetailPage from './page';

import {
  useCommissionStatement,
  useApproveCommission,
  useDisputeCommission,
  useApproveStatement,
} from '@/hooks/use-commissions';


vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ id: 'rep-1' })),
  useSearchParams: vi.fn(() => ({
    get: (key: string) => (key === 'period' ? '2026-02' : null),
  })),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/hooks/use-commissions', () => ({
  useCommissionStatement: vi.fn(),
  useApproveCommission: vi.fn(),
  useDisputeCommission: vi.fn(),
  useApproveStatement: vi.fn(),
}));

vi.mock('@/components/commissions/commission-line-item-table', () => ({
  CommissionLineItemTable: ({ lineItems }: { lineItems: unknown[] }) => (
    <div data-testid="commission-line-item-table">Items: {lineItems.length}</div>
  ),
}));

const mockUseCommissionStatement = vi.mocked(useCommissionStatement);
const mockUseApproveCommission = vi.mocked(useApproveCommission);
const mockUseDisputeCommission = vi.mocked(useDisputeCommission);
const mockUseApproveStatement = vi.mocked(useApproveStatement);
const mockUseSearchParams = vi.mocked(useSearchParams);

const mockMutation = {
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isPending: false,
  error: null,
  data: null,
  reset: vi.fn(),
  isIdle: true,
  isSuccess: false,
  isError: false,
  status: 'idle' as const,
  variables: undefined,
  failureCount: 0,
  failureReason: null,
  context: undefined,
  submittedAt: 0,
  isPaused: false,
};

const mockStatement = {
  period: '2026-02',
  repId: 'r1',
  repName: 'Jane Doe',
  lineItems: [],
  totalAmount: 1500,
  status: 'pending',
};

describe('CommissionStatementDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchParams.mockReturnValue({
      get: (key: string) => (key === 'period' ? '2026-02' : null),
    } as unknown as ReturnType<typeof useSearchParams>);
    mockUseApproveCommission.mockReturnValue(
      mockMutation as unknown as ReturnType<typeof useApproveCommission>,
    );
    mockUseDisputeCommission.mockReturnValue(
      mockMutation as unknown as ReturnType<typeof useDisputeCommission>,
    );
    mockUseApproveStatement.mockReturnValue(
      mockMutation as unknown as ReturnType<typeof useApproveStatement>,
    );
  });

  it('FR-P013: renders statement header with period, rep name, and total', () => {
    mockUseCommissionStatement.mockReturnValue({
      data: mockStatement,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useCommissionStatement>);

    render(<CommissionStatementDetailPage />);

    expect(screen.getByText(/Commission Statement/)).toBeInTheDocument();
    expect(screen.getByText(/2026-02/)).toBeInTheDocument();
    expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
    expect(screen.getByText(/\$1,500\.00/)).toBeInTheDocument();
  });

  it('FR-P013: shows skeleton when loading', () => {
    mockUseCommissionStatement.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useCommissionStatement>);

    render(<CommissionStatementDetailPage />);

    const skeletons = screen.getAllByRole('status');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('FR-P013: shows error banner on fetch failure', () => {
    mockUseCommissionStatement.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('fail'),
    } as unknown as ReturnType<typeof useCommissionStatement>);

    render(<CommissionStatementDetailPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Unable to load commission statement')).toBeInTheDocument();
  });

  it('FR-P013: shows "No period specified" when period param is missing', () => {
    mockUseSearchParams.mockReturnValue({
      get: () => null,
    } as unknown as ReturnType<typeof useSearchParams>);
    mockUseCommissionStatement.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useCommissionStatement>);

    render(<CommissionStatementDetailPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('No period specified')).toBeInTheDocument();
  });

  it('FR-P013: renders commission line item table on success', () => {
    mockUseCommissionStatement.mockReturnValue({
      data: mockStatement,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useCommissionStatement>);

    render(<CommissionStatementDetailPage />);

    expect(screen.getByTestId('commission-line-item-table')).toBeInTheDocument();
  });

  it('FR-P013: renders back link to commissions page', () => {
    mockUseCommissionStatement.mockReturnValue({
      data: mockStatement,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useCommissionStatement>);

    render(<CommissionStatementDetailPage />);

    const backLinks = screen.getAllByRole('link');
    const commissionLink = backLinks.find((l) => l.getAttribute('href') === '/commissions');
    expect(commissionLink).toBeTruthy();
  });

  it('FR-P013: shows Approve Statement button when status is pending', () => {
    mockUseCommissionStatement.mockReturnValue({
      data: mockStatement,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useCommissionStatement>);

    render(<CommissionStatementDetailPage />);

    expect(screen.getByRole('button', { name: /Approve Statement/i })).toBeInTheDocument();
  });
});
