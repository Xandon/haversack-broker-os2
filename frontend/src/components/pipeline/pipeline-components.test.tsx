import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PipelineSummary } from './pipeline-summary';
import { KanbanColumn } from './kanban-column';
import { OpportunityCard } from './opportunity-card';
import { CloseDialog } from './close-dialog';
import type { OpportunityResponse } from '@haversack/shared';

// Mock @dnd-kit
vi.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    isDragging: false,
  }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockOpportunity: OpportunityResponse = {
  id: 'opp-1',
  name: 'Big Deal',
  estimatedValue: 50000,
  probability: 75,
  weightedValue: 37500,
  expectedCloseDate: '2026-04-15',
  stage: 'proposal',
  closeReason: null,
  closedAt: null,
  accountId: 'acc-1',
  accountName: 'Acme Corp',
  repId: 'rep-1',
  repName: 'John Doe',
  brands: [
    { id: 'brand-1', name: 'Oregon Bee Co' },
    { id: 'brand-2', name: 'Pacific Spice' },
  ],
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-01T00:00:00Z',
};

describe('FR-042: PipelineSummary', () => {
  test('FR-042: renders forecast cards with formatted values', () => {
    render(
      <PipelineSummary
        weightedTotal={125000}
        totalOpenValue={500000}
        opportunityCount={12}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Weighted Forecast')).toBeDefined();
    expect(screen.getByText('$125,000')).toBeDefined();
    expect(screen.getByText('Total Open Value')).toBeDefined();
    expect(screen.getByText('$500,000')).toBeDefined();
    expect(screen.getByText('Open Opportunities')).toBeDefined();
    expect(screen.getByText('12')).toBeDefined();
  });

  test('FR-042: renders skeleton cards when loading', () => {
    const { container } = render(
      <PipelineSummary
        weightedTotal={0}
        totalOpenValue={0}
        opportunityCount={0}
        isLoading={true}
      />,
    );

    // Should not show the labels when loading
    expect(screen.queryByText('Weighted Forecast')).toBeNull();
    // Should have skeleton elements
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('FR-042: OpportunityCard', () => {
  test('FR-042: renders opportunity details', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);

    expect(screen.getByText('Big Deal')).toBeDefined();
    expect(screen.getByText('Acme Corp')).toBeDefined();
    expect(screen.getByText('$50,000')).toBeDefined();
    expect(screen.getByText('75%')).toBeDefined();
  });

  test('FR-042: renders brand badges (max 2 with overflow)', () => {
    const oppWithManyBrands: OpportunityResponse = {
      ...mockOpportunity,
      brands: [
        { id: 'b1', name: 'Brand A' },
        { id: 'b2', name: 'Brand B' },
        { id: 'b3', name: 'Brand C' },
      ],
    };

    render(<OpportunityCard opportunity={oppWithManyBrands} />);

    expect(screen.getByText('Brand A')).toBeDefined();
    expect(screen.getByText('Brand B')).toBeDefined();
    expect(screen.getByText('+1')).toBeDefined();
    expect(screen.queryByText('Brand C')).toBeNull();
  });

  test('FR-042: links to opportunity detail page', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/opportunities/opp-1');
  });

  test('FR-042: renders expected close date', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);

    expect(screen.getByText(/Close:/)).toBeDefined();
  });
});

describe('FR-042: KanbanColumn', () => {
  test('FR-042: renders column header with label and count', () => {
    render(
      <KanbanColumn
        stage="proposal"
        label="Proposal"
        opportunities={[mockOpportunity]}
        count={1}
        totalValue={50000}
      />,
    );

    expect(screen.getByText('Proposal')).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();
    // $50,000 appears both in column header and opportunity card
    const values = screen.getAllByText('$50,000');
    expect(values.length).toBeGreaterThanOrEqual(1);
  });

  test('FR-042: renders opportunity cards inside column', () => {
    render(
      <KanbanColumn
        stage="proposal"
        label="Proposal"
        opportunities={[mockOpportunity]}
        count={1}
        totalValue={50000}
      />,
    );

    expect(screen.getByText('Big Deal')).toBeDefined();
  });

  test('FR-042: shows empty message when no opportunities', () => {
    render(
      <KanbanColumn
        stage="prospect"
        label="Prospect"
        opportunities={[]}
        count={0}
        totalValue={0}
      />,
    );

    expect(screen.getByText('No opportunities')).toBeDefined();
  });
});

describe('FR-042: CloseDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-042: renders close-won dialog with appropriate title', () => {
    const onConfirm = vi.fn();
    render(
      <CloseDialog
        open={true}
        onOpenChange={vi.fn()}
        stage="closed_won"
        opportunityName="Big Deal"
        onConfirm={onConfirm}
      />,
    );

    // "Mark as Won" appears in both title and button
    const elements = screen.getAllByText('Mark as Won');
    expect(elements.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Big Deal/)).toBeDefined();
  });

  test('FR-042: renders close-lost dialog with destructive button', () => {
    render(
      <CloseDialog
        open={true}
        onOpenChange={vi.fn()}
        stage="closed_lost"
        opportunityName="Lost Deal"
        onConfirm={vi.fn()}
      />,
    );

    const elements = screen.getAllByText('Mark as Lost');
    expect(elements.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Lost Deal/)).toBeDefined();
  });

  test('FR-042: confirm button disabled when no reason entered', () => {
    render(
      <CloseDialog
        open={true}
        onOpenChange={vi.fn()}
        stage="closed_won"
        opportunityName="Big Deal"
        onConfirm={vi.fn()}
      />,
    );

    // Get all buttons, find the confirm one (not "Cancel" and not the close "X")
    const buttons = screen.getAllByRole('button');
    const confirmButton = buttons.find((b) => b.textContent === 'Mark as Won');
    expect(confirmButton).toBeDefined();
    expect(confirmButton!.hasAttribute('disabled')).toBe(true);
  });

  test('FR-042: calls onConfirm with reason when submitted', () => {
    const onConfirm = vi.fn();
    render(
      <CloseDialog
        open={true}
        onOpenChange={vi.fn()}
        stage="closed_won"
        opportunityName="Big Deal"
        onConfirm={onConfirm}
      />,
    );

    const textarea = screen.getByPlaceholderText('Enter win reason...');
    fireEvent.change(textarea, { target: { value: 'Won the competitive bid' } });

    const buttons = screen.getAllByRole('button');
    const confirmButton = buttons.find((b) => b.textContent === 'Mark as Won');
    expect(confirmButton).toBeDefined();
    fireEvent.click(confirmButton!);

    expect(onConfirm).toHaveBeenCalledWith('Won the competitive bid');
  });
});
