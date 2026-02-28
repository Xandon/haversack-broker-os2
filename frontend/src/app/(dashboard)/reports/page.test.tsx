import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import ReportsPage from './page';

vi.mock('@/hooks/use-reports', () => ({
  useRunReport: vi.fn(),
  useExportReport: vi.fn(),
}));

vi.mock('@/components/reports/report-builder', () => ({
  ReportBuilder: ({
    onRunReport,
    onExport,
    reportResult,
    isRunning,
    isExporting,
  }: {
    onRunReport: unknown;
    onExport: unknown;
    reportResult: unknown;
    isRunning: boolean;
    isExporting: boolean;
  }) => (
    <div
      data-testid="report-builder"
      data-is-running={isRunning}
      data-is-exporting={isExporting}
      data-has-result={!!reportResult}
      data-has-run-handler={typeof onRunReport === 'function'}
      data-has-export-handler={typeof onExport === 'function'}
    />
  ),
}));

import { useRunReport, useExportReport } from '@/hooks/use-reports';

const mockUseRunReport = vi.mocked(useRunReport);
const mockUseExportReport = vi.mocked(useExportReport);

const makeMutation = (overrides = {}) => ({
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
  ...overrides,
});

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-P014: renders "Reports" heading', () => {
    mockUseRunReport.mockReturnValue(makeMutation() as unknown as ReturnType<typeof useRunReport>);
    mockUseExportReport.mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof useExportReport>,
    );

    render(<ReportsPage />);

    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('FR-P014: shows error banner when runReport has error', () => {
    mockUseRunReport.mockReturnValue(
      makeMutation({ error: new Error('report fail') }) as unknown as ReturnType<
        typeof useRunReport
      >,
    );
    mockUseExportReport.mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof useExportReport>,
    );

    render(<ReportsPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Unable to generate report')).toBeInTheDocument();
  });

  it('FR-P014: does not show error banner when no error', () => {
    mockUseRunReport.mockReturnValue(makeMutation() as unknown as ReturnType<typeof useRunReport>);
    mockUseExportReport.mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof useExportReport>,
    );

    render(<ReportsPage />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('FR-P014: renders ReportBuilder component', () => {
    mockUseRunReport.mockReturnValue(makeMutation() as unknown as ReturnType<typeof useRunReport>);
    mockUseExportReport.mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof useExportReport>,
    );

    render(<ReportsPage />);

    expect(screen.getByTestId('report-builder')).toBeInTheDocument();
  });

  it('FR-P014: passes correct props to ReportBuilder', () => {
    const mockRunResult = { rows: [{ id: '1' }], totalCount: 1, page: 1, limit: 20 };
    mockUseRunReport.mockReturnValue(
      makeMutation({ data: mockRunResult, isPending: true }) as unknown as ReturnType<
        typeof useRunReport
      >,
    );
    mockUseExportReport.mockReturnValue(
      makeMutation({ isPending: true }) as unknown as ReturnType<typeof useExportReport>,
    );

    render(<ReportsPage />);

    const builder = screen.getByTestId('report-builder');
    expect(builder).toHaveAttribute('data-is-running', 'true');
    expect(builder).toHaveAttribute('data-is-exporting', 'true');
    expect(builder).toHaveAttribute('data-has-result', 'true');
    expect(builder).toHaveAttribute('data-has-run-handler', 'true');
    expect(builder).toHaveAttribute('data-has-export-handler', 'true');
  });
});
