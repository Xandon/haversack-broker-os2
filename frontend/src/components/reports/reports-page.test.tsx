import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReportsPage from '@/app/(authenticated)/reports/page';
import ReportDetailPage from '@/app/(authenticated)/reports/[id]/page';

vi.mock('@/hooks/use-reports', () => ({
  useReports: vi.fn(),
  useReport: vi.fn(),
  useDeleteReport: vi.fn(),
  useExecuteReport: vi.fn(),
  useExportReport: vi.fn(),
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
  useParams: vi.fn().mockReturnValue({ id: 'rpt-1' }),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
}));

import {
  useReports,
  useReport,
  useDeleteReport,
  useExecuteReport,
  useExportReport,
} from '@/hooks/use-reports';

const mockReports = [
  {
    id: 'rpt-1',
    name: 'Monthly Orders',
    description: 'All orders this month',
    entityType: 'ORDER' as const,
    filters: {},
    columns: ['orderNumber', 'accountName', 'total'],
    isShared: false,
    createdByName: 'Admin User',
    lastRunAt: '2026-02-15T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rpt-2',
    name: 'Account Summary',
    description: null,
    entityType: 'ACCOUNT' as const,
    filters: {},
    columns: ['name', 'territoryName'],
    isShared: true,
    createdByName: 'Manager User',
    lastRunAt: null,
    createdAt: '2026-02-01T00:00:00Z',
  },
];

describe('FR-046: ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDeleteReport).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteReport>);
  });

  test('FR-046: renders reports list', () => {
    vi.mocked(useReports).mockReturnValue({
      data: { data: mockReports, pagination: { cursor: null, hasMore: false, total: 2 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useReports>);

    render(<ReportsPage />);

    expect(screen.getByText('Reports')).toBeDefined();
    expect(screen.getByText('Monthly Orders')).toBeDefined();
    expect(screen.getByText('Account Summary')).toBeDefined();
    expect(screen.getByText('ORDER')).toBeDefined();
    expect(screen.getByText('ACCOUNT')).toBeDefined();
  });

  test('FR-046: shows shared badge for shared reports', () => {
    vi.mocked(useReports).mockReturnValue({
      data: { data: mockReports, pagination: { cursor: null, hasMore: false, total: 2 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useReports>);

    render(<ReportsPage />);

    expect(screen.getByText('Shared')).toBeDefined();
  });

  test('FR-046: has new report button', () => {
    vi.mocked(useReports).mockReturnValue({
      data: { data: mockReports, pagination: { cursor: null, hasMore: false, total: 2 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useReports>);

    render(<ReportsPage />);

    expect(screen.getByText('New Report')).toBeDefined();
  });

  test('FR-046: renders loading state', () => {
    vi.mocked(useReports).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useReports>);

    const { container } = render(<ReportsPage />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('FR-046: renders error state', () => {
    vi.mocked(useReports).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useReports>);

    render(<ReportsPage />);

    expect(screen.getByText('Failed to load reports')).toBeDefined();
  });

  test('FR-046: renders empty state', () => {
    vi.mocked(useReports).mockReturnValue({
      data: { data: [], pagination: { cursor: null, hasMore: false, total: 0 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useReports>);

    render(<ReportsPage />);

    expect(screen.getByText('No reports yet')).toBeDefined();
  });

  test('FR-046: delete button calls useDeleteReport', () => {
    const mutateFn = vi.fn();
    vi.mocked(useDeleteReport).mockReturnValue({
      mutate: mutateFn,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteReport>);
    vi.mocked(useReports).mockReturnValue({
      data: { data: mockReports, pagination: { cursor: null, hasMore: false, total: 2 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useReports>);

    render(<ReportsPage />);

    const deleteButtons = screen.getAllByLabelText(/Delete/);
    fireEvent.click(deleteButtons[0]);
    expect(mutateFn).toHaveBeenCalledWith('rpt-1', expect.anything());
  });
});

describe('FR-046: ReportDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useExecuteReport).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: undefined,
    } as unknown as ReturnType<typeof useExecuteReport>);
    vi.mocked(useExportReport).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useExportReport>);
  });

  test('FR-046: renders report detail with metadata', () => {
    vi.mocked(useReport).mockReturnValue({
      data: { data: mockReports[0] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useReport>);

    render(<ReportDetailPage />);

    const titleElements = screen.getAllByText('Monthly Orders');
    expect(titleElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('ORDER')).toBeDefined();
    expect(screen.getByText('Admin User')).toBeDefined();
  });

  test('FR-046: has run report button', () => {
    vi.mocked(useReport).mockReturnValue({
      data: { data: mockReports[0] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useReport>);

    render(<ReportDetailPage />);

    expect(screen.getByText('Run Report')).toBeDefined();
  });

  test('FR-046: has export buttons', () => {
    vi.mocked(useReport).mockReturnValue({
      data: { data: mockReports[0] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useReport>);

    render(<ReportDetailPage />);

    expect(screen.getByText('CSV')).toBeDefined();
    expect(screen.getByText('XLSX')).toBeDefined();
  });

  test('FR-046: run report calls useExecuteReport', () => {
    const mutateFn = vi.fn();
    vi.mocked(useExecuteReport).mockReturnValue({
      mutate: mutateFn,
      isPending: false,
      data: undefined,
    } as unknown as ReturnType<typeof useExecuteReport>);
    vi.mocked(useReport).mockReturnValue({
      data: { data: mockReports[0] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useReport>);

    render(<ReportDetailPage />);

    fireEvent.click(screen.getByText('Run Report'));
    expect(mutateFn).toHaveBeenCalledWith({ reportId: 'rpt-1' }, expect.anything());
  });

  test('FR-046: displays results table after execution', () => {
    vi.mocked(useExecuteReport).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: {
        data: [{ orderNumber: 'ORD-001', accountName: 'Coffee Co', total: 5000 }],
        pagination: { cursor: null, hasMore: false, total: 1 },
        truncated: false,
        columns: [
          { key: 'orderNumber', label: 'Order Number', type: 'string' as const },
          { key: 'accountName', label: 'Account Name', type: 'string' as const },
          { key: 'total', label: 'Total', type: 'currency' as const },
        ],
      },
    } as unknown as ReturnType<typeof useExecuteReport>);
    vi.mocked(useReport).mockReturnValue({
      data: { data: mockReports[0] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useReport>);

    render(<ReportDetailPage />);

    expect(screen.getByText('Results (1 records)')).toBeDefined();
    expect(screen.getByText('ORD-001')).toBeDefined();
    expect(screen.getByText('Coffee Co')).toBeDefined();
    expect(screen.getByText('$5,000.00')).toBeDefined();
  });
});
