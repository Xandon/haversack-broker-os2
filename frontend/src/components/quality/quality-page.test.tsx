import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/hooks/use-quality', () => ({
  useQualityScorecard: vi.fn(),
  useQualityDrillDown: vi.fn(),
}));

import { useQualityScorecard, useQualityDrillDown } from '@/hooks/use-quality';

// Dynamic import of the page component
import QualityPage from '@/app/(authenticated)/admin/quality/page';

const mockScorecardData = {
  data: {
    accountCompleteness: 85.5,
    contactEmailValidity: 92.3,
    productImages: 78.1,
    duplicateAccountCount: 3,
    staleAccountCount: 7,
    compositeScore: 82.4,
    calculatedAt: '2026-02-28T03:00:00Z',
  },
};

const mockDrillDownData = {
  data: {
    metric: 'accountCompleteness',
    items: [
      { id: 'acc-1', name: 'Acme Corp', issue: 'Missing phone number' },
      { id: 'acc-2', name: 'Beta LLC', issue: 'Missing email' },
    ],
    total: 2,
    page: 1,
    limit: 50,
  },
};

describe('FR-050: QualityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQualityDrillDown).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useQualityDrillDown>);
  });

  test('FR-050: renders page header', () => {
    vi.mocked(useQualityScorecard).mockReturnValue({
      data: mockScorecardData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQualityScorecard>);

    render(<QualityPage />);

    expect(screen.getByText('Data Quality Scorecard')).toBeDefined();
  });

  test('FR-050: shows loading skeletons', () => {
    vi.mocked(useQualityScorecard).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQualityScorecard>);

    render(<QualityPage />);

    // Loading state should not show metric cards
    expect(screen.queryByText('Account Completeness')).toBeNull();
  });

  test('FR-050: shows error state', () => {
    vi.mocked(useQualityScorecard).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQualityScorecard>);

    render(<QualityPage />);

    expect(screen.getByText('Could not load data quality scorecard. Please try again.')).toBeDefined();
  });

  test('AC-050a: displays composite score and metric cards', () => {
    vi.mocked(useQualityScorecard).mockReturnValue({
      data: mockScorecardData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQualityScorecard>);

    render(<QualityPage />);

    // Composite score
    expect(screen.getByText('82')).toBeDefined();
    expect(screen.getByText('Composite Quality Score')).toBeDefined();

    // Metric cards
    expect(screen.getByText('Account Completeness')).toBeDefined();
    expect(screen.getByText('Contact Email Validity')).toBeDefined();
    expect(screen.getByText('Product Images')).toBeDefined();
    expect(screen.getByText('Duplicate Accounts')).toBeDefined();
    expect(screen.getByText('Stale Accounts')).toBeDefined();
  });

  test('AC-050a: shows metric values', () => {
    vi.mocked(useQualityScorecard).mockReturnValue({
      data: mockScorecardData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQualityScorecard>);

    render(<QualityPage />);

    // Percentage metrics (rounded)
    expect(screen.getByText('86%')).toBeDefined();
    expect(screen.getByText('92%')).toBeDefined();
    expect(screen.getByText('78%')).toBeDefined();
    // Count metrics
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('7')).toBeDefined();
  });

  test('AC-050a: shows trend indicators', () => {
    vi.mocked(useQualityScorecard).mockReturnValue({
      data: mockScorecardData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQualityScorecard>);

    render(<QualityPage />);

    // Default trend is 0 (stable)
    const stableIndicators = screen.getAllByTestId('trend-stable');
    expect(stableIndicators.length).toBeGreaterThanOrEqual(1);
  });

  test('AC-050b: clicking View Details shows drill-down table', () => {
    vi.mocked(useQualityScorecard).mockReturnValue({
      data: mockScorecardData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQualityScorecard>);
    vi.mocked(useQualityDrillDown).mockReturnValue({
      data: mockDrillDownData,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useQualityDrillDown>);

    render(<QualityPage />);

    const viewButtons = screen.getAllByText('View Details');
    fireEvent.click(viewButtons[0] as HTMLElement);

    expect(screen.getByText('Account Completeness — Affected Records')).toBeDefined();
    expect(screen.getByText('Acme Corp')).toBeDefined();
    expect(screen.getByText('Missing phone number')).toBeDefined();
    expect(screen.getByText('Beta LLC')).toBeDefined();
    expect(screen.getByText('Missing email')).toBeDefined();
  });

  test('AC-050b: drill-down shows total count', () => {
    vi.mocked(useQualityScorecard).mockReturnValue({
      data: mockScorecardData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQualityScorecard>);
    vi.mocked(useQualityDrillDown).mockReturnValue({
      data: mockDrillDownData,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useQualityDrillDown>);

    render(<QualityPage />);

    const viewButtons = screen.getAllByText('View Details');
    fireEvent.click(viewButtons[0] as HTMLElement);

    expect(screen.getByText('2 affected records')).toBeDefined();
  });

  test('FR-050: back button returns to scorecard view', () => {
    vi.mocked(useQualityScorecard).mockReturnValue({
      data: mockScorecardData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQualityScorecard>);
    vi.mocked(useQualityDrillDown).mockReturnValue({
      data: mockDrillDownData,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useQualityDrillDown>);

    render(<QualityPage />);

    // Click View Details
    const viewButtons = screen.getAllByText('View Details');
    fireEvent.click(viewButtons[0] as HTMLElement);

    // Click Back
    fireEvent.click(screen.getByText('Back to Scorecard'));

    // Should show scorecard again
    expect(screen.getByText('Composite Quality Score')).toBeDefined();
  });

  test('FR-050: shows last calculated date', () => {
    vi.mocked(useQualityScorecard).mockReturnValue({
      data: mockScorecardData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQualityScorecard>);

    render(<QualityPage />);

    expect(screen.getByText(/Last calculated:/)).toBeDefined();
  });
});
