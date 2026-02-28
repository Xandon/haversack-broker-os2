import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import DataQualityPage from './page';

import { useDataQualityScorecard } from '@/hooks/use-data-quality';


vi.mock('@/hooks/use-data-quality', () => ({
  useDataQualityScorecard: vi.fn(),
}));

vi.mock('@/components/data-quality/data-quality-dashboard', () => ({
  DataQualityDashboard: ({ scorecard }: { scorecard: unknown }) => (
    <div data-testid="data-quality-dashboard" data-score={JSON.stringify(scorecard)}>
      Data Quality Dashboard
    </div>
  ),
}));

vi.mock('@/components/shared/error-banner', () => ({
  ErrorBanner: ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
    <div role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  ),
}));

vi.mock('@/components/shared/skeleton', () => ({
  SkeletonCard: () => <div data-testid="skeleton-card" role="status" aria-label="Loading" />,
}));

const mockUseDataQualityScorecard = useDataQualityScorecard as ReturnType<typeof vi.fn>;

const mockScorecard = {
  overallScore: 85,
  entityScores: [],
  dimensionScores: [],
  issues: [],
  trend: [],
};

function setupDefaultMocks() {
  mockUseDataQualityScorecard.mockReturnValue({
    data: mockScorecard,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
}

describe('DataQualityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-P018: renders "Data Quality" heading', () => {
    setupDefaultMocks();
    render(<DataQualityPage />);

    expect(screen.getByRole('heading', { name: /data quality/i })).toBeInTheDocument();
  });

  it('FR-P018: shows skeleton cards when loading', () => {
    mockUseDataQualityScorecard.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<DataQualityPage />);

    const skeletonCards = screen.getAllByTestId('skeleton-card');
    expect(skeletonCards).toHaveLength(6);
  });

  it('FR-P018: shows error banner on error', () => {
    mockUseDataQualityScorecard.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load scores'),
      refetch: vi.fn(),
    });

    render(<DataQualityPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Unable to load data quality scores')).toBeInTheDocument();
  });

  it('FR-P018: renders DataQualityDashboard on success', () => {
    setupDefaultMocks();
    render(<DataQualityPage />);

    expect(screen.getByTestId('data-quality-dashboard')).toBeInTheDocument();
    expect(screen.getByText('Data Quality Dashboard')).toBeInTheDocument();
  });

  it('FR-P018: does not render dashboard when data is undefined and not loading', () => {
    mockUseDataQualityScorecard.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DataQualityPage />);

    expect(screen.queryByTestId('data-quality-dashboard')).not.toBeInTheDocument();
  });

  it('FR-P018: error banner has retry button that calls refetch', () => {
    const mockRefetch = vi.fn();
    mockUseDataQualityScorecard.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('fail'),
      refetch: mockRefetch,
    });

    render(<DataQualityPage />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    retryButton.click();

    expect(mockRefetch).toHaveBeenCalled();
  });
});
