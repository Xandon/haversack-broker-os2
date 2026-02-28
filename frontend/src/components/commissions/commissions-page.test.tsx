import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CommissionsPage from '@/app/(authenticated)/commissions/page';
import CommissionStatementDetailPage from '@/app/(authenticated)/commissions/[id]/page';

vi.mock('@/hooks/use-commissions', () => ({
  useCommissionStatements: vi.fn(),
  useCommissionStatement: vi.fn(),
  useExportCommissions: vi.fn(),
  useApproveStatement: vi.fn(),
  useRejectStatement: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useParams: vi.fn().mockReturnValue({ id: 'stmt-1' }),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
}));

import {
  useCommissionStatements,
  useCommissionStatement,
  useExportCommissions,
  useApproveStatement,
  useRejectStatement,
} from '@/hooks/use-commissions';

const mockStatements = [
  {
    id: 'stmt-1',
    repId: 'rep-1',
    repName: 'Jane Doe',
    month: 3,
    year: 2026,
    status: 'pending' as const,
    totalEarned: 5250.75,
    ytdTotal: 15800.50,
    approvedBy: null,
    approvedAt: null,
    exportedAt: null,
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'stmt-2',
    repId: 'rep-2',
    repName: 'John Smith',
    month: 3,
    year: 2026,
    status: 'approved' as const,
    totalEarned: 3100.00,
    ytdTotal: 9800.00,
    approvedBy: 'mgr-1',
    approvedAt: '2026-03-15T00:00:00Z',
    exportedAt: null,
    createdAt: '2026-03-01T00:00:00Z',
  },
];

describe('FR-044: CommissionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useExportCommissions).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useExportCommissions>);
  });

  test('FR-044: renders commission statements list', () => {
    vi.mocked(useCommissionStatements).mockReturnValue({
      data: { data: mockStatements, pagination: { cursor: null, hasMore: false, total: 2 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissionStatements>);

    render(<CommissionsPage />);

    expect(screen.getByText('Commissions')).toBeDefined();
    expect(screen.getByText('Jane Doe')).toBeDefined();
    expect(screen.getByText('John Smith')).toBeDefined();
    expect(screen.getByText('$5,250.75')).toBeDefined();
    // "Pending" and "Approved" appear in both status badges and filter options
    const pendingElements = screen.getAllByText('Pending');
    expect(pendingElements.length).toBeGreaterThanOrEqual(1);
    const approvedElements = screen.getAllByText('Approved');
    expect(approvedElements.length).toBeGreaterThanOrEqual(1);
  });

  test('FR-044: shows YTD amounts', () => {
    vi.mocked(useCommissionStatements).mockReturnValue({
      data: { data: mockStatements, pagination: { cursor: null, hasMore: false, total: 2 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissionStatements>);

    render(<CommissionsPage />);

    expect(screen.getByText('YTD: $15,800.50')).toBeDefined();
  });

  test('FR-044: renders loading skeletons', () => {
    vi.mocked(useCommissionStatements).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissionStatements>);

    const { container } = render(<CommissionsPage />);

    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('FR-044: renders error state', () => {
    vi.mocked(useCommissionStatements).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissionStatements>);

    render(<CommissionsPage />);

    expect(screen.getByText('Failed to load commissions')).toBeDefined();
  });

  test('FR-044: has export button', () => {
    vi.mocked(useCommissionStatements).mockReturnValue({
      data: { data: mockStatements, pagination: { cursor: null, hasMore: false, total: 2 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissionStatements>);

    render(<CommissionsPage />);

    expect(screen.getByText('Export to QB')).toBeDefined();
  });
});

describe('FR-044: CommissionStatementDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useApproveStatement).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useApproveStatement>);
    vi.mocked(useRejectStatement).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useRejectStatement>);
  });

  test('FR-044: renders statement detail with entries', () => {
    vi.mocked(useCommissionStatement).mockReturnValue({
      data: {
        data: {
          ...mockStatements[0],
          entries: [
            {
              id: 'entry-1',
              orderId: 'ord-1',
              orderNumber: 'ORD-001',
              orderLineItemId: 'li-1',
              accountName: 'Coffee Co',
              brandName: 'Oregon Bee Co',
              entryType: 'calculation',
              baseRate: 0.10,
              territoryModifier: 1.0,
              volumeTierApplied: 'Base tier',
              effectiveRate: 0.10,
              lineItemTotal: 5000,
              commissionAmount: 500,
              calculatedAt: '2026-03-05T00:00:00Z',
              disputeStatus: null,
            },
          ],
          disputes: [],
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissionStatement>);

    render(<CommissionStatementDetailPage />);

    // Header with rep name and month
    const headerElements = screen.getAllByText(/March 2026/);
    expect(headerElements.length).toBeGreaterThanOrEqual(1);

    // Summary cards
    expect(screen.getByText('$5,250.75')).toBeDefined();
    expect(screen.getByText('$15,800.50')).toBeDefined();

    // Entry details
    expect(screen.getByText('Coffee Co')).toBeDefined();
    expect(screen.getByText(/Oregon Bee Co/)).toBeDefined();
    expect(screen.getByText('$500.00')).toBeDefined();
  });

  test('FR-044: shows approve/reject buttons for pending statements', () => {
    vi.mocked(useCommissionStatement).mockReturnValue({
      data: {
        data: { ...mockStatements[0], entries: [], disputes: [] },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissionStatement>);

    render(<CommissionStatementDetailPage />);

    expect(screen.getByText('Approve')).toBeDefined();
    expect(screen.getByText('Reject')).toBeDefined();
  });

  test('FR-044: approve button calls useApproveStatement', () => {
    const mutateFn = vi.fn();
    vi.mocked(useApproveStatement).mockReturnValue({
      mutate: mutateFn,
      isPending: false,
    } as unknown as ReturnType<typeof useApproveStatement>);
    vi.mocked(useCommissionStatement).mockReturnValue({
      data: {
        data: { ...mockStatements[0], entries: [], disputes: [] },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissionStatement>);

    render(<CommissionStatementDetailPage />);

    fireEvent.click(screen.getByText('Approve'));
    expect(mutateFn).toHaveBeenCalledWith('stmt-1', expect.anything());
  });

  test('FR-044: renders disputes section when present', () => {
    vi.mocked(useCommissionStatement).mockReturnValue({
      data: {
        data: {
          ...mockStatements[0],
          entries: [],
          disputes: [
            {
              id: 'disp-1',
              statementId: 'stmt-1',
              commissionEntryId: 'entry-1',
              filedBy: 'rep-1',
              filerName: 'Jane Doe',
              reason: 'Rate should be higher',
              status: 'open',
              originalAmount: 500,
              adjustedAmount: null,
              resolvedBy: null,
              resolverName: null,
              resolvedAt: null,
              resolutionNotes: null,
              createdAt: '2026-03-10T00:00:00Z',
            },
          ],
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommissionStatement>);

    render(<CommissionStatementDetailPage />);

    expect(screen.getByText('Disputes (1)')).toBeDefined();
    expect(screen.getByText('Rate should be higher')).toBeDefined();
    // Jane Doe appears in both the header (repName) and dispute (filerName)
    const janeElements = screen.getAllByText(/Jane Doe/);
    expect(janeElements.length).toBeGreaterThanOrEqual(1);
  });
});
