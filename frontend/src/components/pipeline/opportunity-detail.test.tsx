import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import OpportunityDetailPage from '@/app/(authenticated)/opportunities/[id]/page';
import NewOpportunityPage from '@/app/(authenticated)/opportunities/new/page';

vi.mock('next/navigation', () => ({
  useParams: vi.fn().mockReturnValue({ id: 'opp-1' }),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/hooks/use-opportunity-mutations', () => ({
  useOpportunityDetail: vi.fn(),
  useCreateOpportunity: vi.fn(),
  useUpdateOpportunity: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useOpportunityDetail, useCreateOpportunity } from '@/hooks/use-opportunity-mutations';

const mockOpportunity = {
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

describe('FR-043: OpportunityDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-043: renders opportunity detail with overview', () => {
    vi.mocked(useOpportunityDetail).mockReturnValue({
      data: { data: mockOpportunity },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useOpportunityDetail>);

    render(<OpportunityDetailPage />);

    // Name in header and breadcrumbs
    const nameElements = screen.getAllByText('Big Deal');
    expect(nameElements.length).toBeGreaterThanOrEqual(1);

    // Overview values
    expect(screen.getByText('$50,000')).toBeDefined();
    expect(screen.getByText('$37,500')).toBeDefined();
    expect(screen.getByText('75%')).toBeDefined();
    expect(screen.getByText('Proposal')).toBeDefined();
  });

  test('FR-043: renders account link and rep name', () => {
    vi.mocked(useOpportunityDetail).mockReturnValue({
      data: { data: mockOpportunity },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useOpportunityDetail>);

    render(<OpportunityDetailPage />);

    expect(screen.getByText('Acme Corp')).toBeDefined();
    expect(screen.getByText('John Doe')).toBeDefined();

    const accountLink = screen.getByText('Acme Corp');
    expect(accountLink.closest('a')?.getAttribute('href')).toBe('/accounts/acc-1');
  });

  test('FR-043: renders associated brands', () => {
    vi.mocked(useOpportunityDetail).mockReturnValue({
      data: { data: mockOpportunity },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useOpportunityDetail>);

    render(<OpportunityDetailPage />);

    expect(screen.getByText('Oregon Bee Co')).toBeDefined();
    expect(screen.getByText('Pacific Spice')).toBeDefined();
  });

  test('FR-043: renders skeleton while loading', () => {
    vi.mocked(useOpportunityDetail).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useOpportunityDetail>);

    const { container } = render(<OpportunityDetailPage />);

    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('FR-043: renders error state', () => {
    vi.mocked(useOpportunityDetail).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useOpportunityDetail>);

    render(<OpportunityDetailPage />);

    expect(screen.getByText('Opportunity not found')).toBeDefined();
  });

  test('FR-043: renders close reason when closed', () => {
    const closedOpp = {
      ...mockOpportunity,
      stage: 'closed_won',
      closeReason: 'Won the competitive bid',
      closedAt: '2026-03-01T00:00:00Z',
    };
    vi.mocked(useOpportunityDetail).mockReturnValue({
      data: { data: closedOpp },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useOpportunityDetail>);

    render(<OpportunityDetailPage />);

    expect(screen.getByText('Won the competitive bid')).toBeDefined();
    expect(screen.getByText('Closed Won')).toBeDefined();
  });
});

describe('FR-043: NewOpportunityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCreateOpportunity).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateOpportunity>);
  });

  test('FR-043: renders new opportunity form', () => {
    render(<NewOpportunityPage />);

    // Breadcrumbs
    const pipelineLinks = screen.getAllByText('Pipeline');
    expect(pipelineLinks.length).toBeGreaterThanOrEqual(1);

    // Form title (appears in breadcrumb, page header, and card title)
    const newOppElements = screen.getAllByText('New Opportunity');
    expect(newOppElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Create Opportunity')).toBeDefined();
  });
});
