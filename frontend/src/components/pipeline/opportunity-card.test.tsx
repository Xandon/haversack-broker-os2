import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OpportunityCard } from './opportunity-card';

const mockOpportunity = {
  id: '1',
  name: 'Big Retailer Deal',
  accountId: 'acc-1',
  assignedRepId: 'rep-1',
  stage: 'proposal',
  probability: 60,
  estimatedValue: 50000,
  weightedValue: 30000,
  closeDate: '2026-06-15',
  associatedBrandIds: [],
  createdAt: '2026-02-01',
  updatedAt: '2026-02-01',
  account: { id: 'acc-1', name: 'Pacific Bistro' },
  assignedRep: { id: 'rep-1', firstName: 'John', lastName: 'Smith' },
};

describe('OpportunityCard', () => {
  it('FR-017: renders opportunity name', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);
    expect(screen.getByText('Big Retailer Deal')).toBeInTheDocument();
  });

  it('AC-017a: displays account name', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);
    expect(screen.getByText('Pacific Bistro')).toBeInTheDocument();
  });

  it('AC-017a: displays estimated value formatted as currency', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);
    expect(screen.getByText('$50,000')).toBeInTheDocument();
  });

  it('AC-017a: displays expected close date', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);
    // Date may shift by timezone; assert the month and year are shown
    expect(screen.getByText(/Jun \d+, 2026/)).toBeInTheDocument();
  });

  it('FR-017: displays probability bar', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('FR-017: displays assigned rep name', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('FR-017: calls onClick when card is clicked', async () => {
    const onClick = vi.fn();
    render(<OpportunityCard opportunity={mockOpportunity} onClick={onClick} />);

    const card = screen.getByRole('listitem');
    card.click();

    expect(onClick).toHaveBeenCalledWith(mockOpportunity);
  });

  it('FR-017: has accessible label with opportunity info', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);
    expect(screen.getByRole('listitem')).toHaveAttribute(
      'aria-label',
      'Opportunity: Big Retailer Deal, $50,000',
    );
  });
});
