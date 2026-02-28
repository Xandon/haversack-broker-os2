import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OpportunitiesPage from '@/app/(authenticated)/opportunities/page';
import type { PipelineSummaryApiResponse } from '@/hooks/use-opportunities';

vi.mock('@/hooks/use-opportunities', () => ({
  usePipelineSummary: vi.fn(),
  useTransitionOpportunity: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    isDragging: false,
  }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { usePipelineSummary, useTransitionOpportunity } from '@/hooks/use-opportunities';

const mockPipelineData: PipelineSummaryApiResponse = {
  data: {
    stages: {
      prospect: {
        opportunities: [
          {
            id: 'opp-1',
            name: 'Prospect Deal',
            estimatedValue: 10000,
            probability: 20,
            weightedValue: 2000,
            expectedCloseDate: '2026-05-01',
            stage: 'prospect',
            closeReason: null,
            closedAt: null,
            accountId: 'acc-1',
            accountName: 'Coffee Co',
            repId: 'rep-1',
            repName: 'Jane Doe',
            brands: [],
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-15T00:00:00Z',
          },
        ],
        count: 1,
        totalValue: 10000,
      },
      qualified: { opportunities: [], count: 0, totalValue: 0 },
      proposal: {
        opportunities: [
          {
            id: 'opp-2',
            name: 'Big Proposal',
            estimatedValue: 50000,
            probability: 60,
            weightedValue: 30000,
            expectedCloseDate: '2026-04-15',
            stage: 'proposal',
            closeReason: null,
            closedAt: null,
            accountId: 'acc-2',
            accountName: 'Restaurant Group',
            repId: 'rep-1',
            repName: 'Jane Doe',
            brands: [{ id: 'b1', name: 'Oregon Bee Co' }],
            isActive: true,
            createdAt: '2026-02-01T00:00:00Z',
            updatedAt: '2026-02-15T00:00:00Z',
          },
        ],
        count: 1,
        totalValue: 50000,
      },
      negotiation: { opportunities: [], count: 0, totalValue: 0 },
      closed_won: { opportunities: [], count: 0, totalValue: 0 },
      closed_lost: { opportunities: [], count: 0, totalValue: 0 },
    },
    forecast: {
      weightedTotal: 32000,
      totalOpenValue: 60000,
      opportunityCount: 2,
    },
  },
};

describe('FR-042: Opportunities Pipeline Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTransitionOpportunity).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useTransitionOpportunity>);
  });

  test('FR-042: renders pipeline page with summary and kanban columns', () => {
    vi.mocked(usePipelineSummary).mockReturnValue({
      data: mockPipelineData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePipelineSummary>);

    render(<OpportunitiesPage />);

    // Page header
    expect(screen.getByText('Pipeline')).toBeDefined();

    // Summary cards
    expect(screen.getByText('$32,000')).toBeDefined();
    expect(screen.getByText('$60,000')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();

    // Column headers
    expect(screen.getByText('Prospect')).toBeDefined();
    expect(screen.getByText('Qualified')).toBeDefined();
    expect(screen.getByText('Proposal')).toBeDefined();
    expect(screen.getByText('Negotiation')).toBeDefined();
    expect(screen.getByText('Closed Won')).toBeDefined();
    expect(screen.getByText('Closed Lost')).toBeDefined();

    // Opportunity cards
    expect(screen.getByText('Prospect Deal')).toBeDefined();
    expect(screen.getByText('Big Proposal')).toBeDefined();
  });

  test('FR-042: renders loading skeletons when data is loading', () => {
    vi.mocked(usePipelineSummary).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePipelineSummary>);

    const { container } = render(<OpportunitiesPage />);

    // Should not show column headers
    expect(screen.queryByText('Prospect')).toBeNull();

    // Should have skeleton elements
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('FR-042: renders error state with retry', () => {
    const refetch = vi.fn();
    vi.mocked(usePipelineSummary).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as unknown as ReturnType<typeof usePipelineSummary>);

    render(<OpportunitiesPage />);

    expect(screen.getByText('Failed to load pipeline')).toBeDefined();
    const retryButton = screen.getByText('Try again');
    fireEvent.click(retryButton);
    expect(refetch).toHaveBeenCalled();
  });

  test('FR-042: toggles between kanban and list view', () => {
    vi.mocked(usePipelineSummary).mockReturnValue({
      data: mockPipelineData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePipelineSummary>);

    render(<OpportunitiesPage />);

    // Default is kanban view - should show column headers
    expect(screen.getByText('Prospect')).toBeDefined();

    // Switch to list view
    const listButton = screen.getByLabelText('List view');
    fireEvent.click(listButton);

    // In list view, opportunities are grouped by stage with count
    const prospectHeaders = screen.getAllByText(/Prospect/);
    expect(prospectHeaders.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Big Proposal')).toBeDefined();
  });

  test('FR-042: shows opportunity values in list view', () => {
    vi.mocked(usePipelineSummary).mockReturnValue({
      data: mockPipelineData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePipelineSummary>);

    render(<OpportunitiesPage />);

    // Switch to list view
    fireEvent.click(screen.getByLabelText('List view'));

    // Should show opportunity values
    expect(screen.getByText('$10,000')).toBeDefined();
    expect(screen.getByText('$50,000')).toBeDefined();
  });
});
