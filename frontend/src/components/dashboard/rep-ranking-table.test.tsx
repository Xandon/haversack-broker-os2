import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RepRankingTable } from './rep-ranking-table';

const mockRankings = [
  {
    repId: 'rep-1',
    repName: 'John Smith',
    isActive: true,
    revenue: 150000,
    orderCount: 45,
    activityCount: 120,
    pipelineValue: 500000,
  },
  {
    repId: 'rep-2',
    repName: 'Jane Doe',
    isActive: true,
    revenue: 125000,
    orderCount: 38,
    activityCount: 95,
    pipelineValue: 350000,
  },
  {
    repId: 'rep-3',
    repName: 'Bob Wilson',
    isActive: false,
    revenue: 80000,
    orderCount: 25,
    activityCount: 60,
    pipelineValue: 200000,
  },
];

describe('RepRankingTable', () => {
  it('AC-024a: displays all reps in ranking order', () => {
    render(<RepRankingTable rankings={mockRankings} />);
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
  });

  it('AC-024a: shows rank numbers', () => {
    render(<RepRankingTable rankings={mockRankings} />);
    const cells = screen.getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('1');
  });

  it('AC-024a: displays revenue, order count, activity count, pipeline value', () => {
    render(<RepRankingTable rankings={mockRankings} />);
    expect(screen.getByText('$150,000')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('$500,000')).toBeInTheDocument();
  });

  it('AC-024a: marks inactive reps with Inactive badge', () => {
    render(<RepRankingTable rankings={mockRankings} />);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('FR-024: renders table headers', () => {
    render(<RepRankingTable rankings={mockRankings} />);
    expect(screen.getByText('Rank')).toBeInTheDocument();
    expect(screen.getByText('Rep')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('Activities')).toBeInTheDocument();
    expect(screen.getByText('Pipeline')).toBeInTheDocument();
  });

  it('FR-024: shows heading', () => {
    render(<RepRankingTable rankings={mockRankings} />);
    expect(screen.getByText('Rep Performance Rankings')).toBeInTheDocument();
  });

  it('FR-024: shows empty state when no rankings', () => {
    render(<RepRankingTable rankings={[]} />);
    expect(screen.getByText('No data available for the selected period')).toBeInTheDocument();
  });
});
