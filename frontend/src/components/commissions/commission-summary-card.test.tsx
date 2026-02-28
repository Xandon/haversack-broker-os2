import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CommissionSummaryCard } from './commission-summary-card';

const mockSummary = {
  totalEarned: 5320,
  totalPending: 2120,
  totalApproved: 3200,
  ytdTotal: 45000,
  statementCount: 3,
};

describe('CommissionSummaryCard', () => {
  it('FR-021: displays earned amount for current month', () => {
    render(<CommissionSummaryCard summary={mockSummary} />);
    expect(screen.getByText('$5,320')).toBeInTheDocument();
  });

  it('FR-021: displays pending amount', () => {
    render(<CommissionSummaryCard summary={mockSummary} />);
    expect(screen.getByText('$2,120')).toBeInTheDocument();
  });

  it('FR-021: displays approved amount', () => {
    render(<CommissionSummaryCard summary={mockSummary} />);
    expect(screen.getByText('$3,200')).toBeInTheDocument();
  });

  it('FR-021: displays year-to-date total', () => {
    render(<CommissionSummaryCard summary={mockSummary} />);
    expect(screen.getByText('$45,000')).toBeInTheDocument();
    expect(screen.getByText('Year-to-Date')).toBeInTheDocument();
  });

  it('FR-021: shows all four KPI labels', () => {
    render(<CommissionSummaryCard summary={mockSummary} />);
    expect(screen.getByText('Earned (MTD)')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Year-to-Date')).toBeInTheDocument();
  });
});
