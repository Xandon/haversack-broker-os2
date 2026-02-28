import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PipelinePage from './page';

import { usePipeline, useUpdateOpportunityStage } from '@/hooks/use-opportunities';


vi.mock('@/hooks/use-opportunities', () => ({
  usePipeline: vi.fn(),
  useUpdateOpportunityStage: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/components/pipeline/kanban-board', () => ({
  KanbanBoard: ({ pipeline }: { pipeline: unknown }) => (
    <div data-testid="kanban-board">{JSON.stringify(pipeline)}</div>
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

vi.mock('@/components/shared/empty-state', () => ({
  EmptyState: ({ title, description }: { title: string; description?: string }) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  ),
}));

vi.mock('@/components/shared/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div role="status" aria-label="Loading" className={className} />
  ),
}));

const mockUsePipeline = usePipeline as ReturnType<typeof vi.fn>;
const mockUseUpdateOpportunityStage = useUpdateOpportunityStage as ReturnType<typeof vi.fn>;

const mockPipelineData = {
  stages: [],
  summary: { totalOpportunities: 5, totalWeightedValue: 200000 },
};

function setupDefaultMocks() {
  mockUseUpdateOpportunityStage.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    error: null,
    data: null,
    reset: vi.fn(),
  });
}

describe('PipelinePage', () => {
  it('FR-P009: renders "Pipeline" heading with data', () => {
    setupDefaultMocks();
    mockUsePipeline.mockReturnValue({
      data: mockPipelineData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<PipelinePage />);

    expect(screen.getByRole('heading', { name: /pipeline/i })).toBeInTheDocument();
  });

  it('FR-P009: renders kanban board with pipeline data', () => {
    setupDefaultMocks();
    mockUsePipeline.mockReturnValue({
      data: mockPipelineData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<PipelinePage />);

    expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
  });

  it('FR-P009: shows skeleton columns when loading', () => {
    setupDefaultMocks();
    mockUsePipeline.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<PipelinePage />);

    expect(screen.getByRole('heading', { name: /pipeline/i })).toBeInTheDocument();
    const loadingElements = screen.getAllByRole('status', { name: /loading/i });
    // 6 stage columns, each with 2 skeletons = 12 skeletons
    expect(loadingElements.length).toBe(12);
  });

  it('FR-P009: shows error banner on error', () => {
    setupDefaultMocks();
    mockUsePipeline.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
      refetch: vi.fn(),
    });

    render(<PipelinePage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Unable to load pipeline')).toBeInTheDocument();
  });

  it('FR-P009: shows retry button on error', () => {
    setupDefaultMocks();
    const refetchFn = vi.fn();
    mockUsePipeline.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
      refetch: refetchFn,
    });

    render(<PipelinePage />);

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('FR-P009: shows empty state when no opportunities', () => {
    setupDefaultMocks();
    mockUsePipeline.mockReturnValue({
      data: {
        stages: [],
        summary: { totalOpportunities: 0, totalWeightedValue: 0 },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<PipelinePage />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No opportunities in pipeline')).toBeInTheDocument();
    expect(screen.getByText('Create an opportunity to get started')).toBeInTheDocument();
  });

  it('FR-P009: shows empty state when pipeline data is null', () => {
    setupDefaultMocks();
    mockUsePipeline.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<PipelinePage />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No opportunities in pipeline')).toBeInTheDocument();
  });
});
