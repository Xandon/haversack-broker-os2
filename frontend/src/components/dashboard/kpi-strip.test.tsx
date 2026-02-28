import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KpiStrip } from './kpi-strip';

const mockKpiData = {
  currentMonthRevenue: 125000,
  trailingTwelveMonthRevenue: 1200000,
  accountsManaged: 42,
  activitiesThisMonth: 28,
  openOpportunities: 15,
  weightedPipelineValue: 450000,
  commissionMtd: 8500,
  commissionYtd: 65000,
  healthDistribution: {
    healthy: 30,
    atRisk: 8,
    critical: 4,
  },
};

describe('KpiStrip', () => {
  it('AC-023a: displays current month revenue', () => {
    render(<KpiStrip kpiData={mockKpiData} />);
    expect(screen.getByText('$125,000')).toBeInTheDocument();
    expect(screen.getByText('Revenue (MTD)')).toBeInTheDocument();
  });

  it('AC-023a: displays activity count', () => {
    render(<KpiStrip kpiData={mockKpiData} />);
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.getByText('Activities')).toBeInTheDocument();
  });

  it('AC-023a: displays open opportunity count with weighted value', () => {
    render(<KpiStrip kpiData={mockKpiData} />);
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Pipeline')).toBeInTheDocument();
    expect(screen.getByText(/Weighted: \$450,000/)).toBeInTheDocument();
  });

  it('AC-023a: displays commission MTD and YTD', () => {
    render(<KpiStrip kpiData={mockKpiData} />);
    expect(screen.getByText('$8,500')).toBeInTheDocument();
    expect(screen.getByText(/YTD: \$65,000/)).toBeInTheDocument();
  });

  it('AC-023a: displays account health distribution', () => {
    render(<KpiStrip kpiData={mockKpiData} />);
    expect(screen.getByText('30 healthy')).toBeInTheDocument();
    expect(screen.getByText(/8 at-risk.*4 critical/)).toBeInTheDocument();
  });

  it('AC-023b: health card is clickable when critical accounts exist', () => {
    const onHealthClick = vi.fn();
    render(<KpiStrip kpiData={mockKpiData} onHealthClick={onHealthClick} />);

    const healthCard = screen.getByText('30 healthy').closest('[role="button"]');
    expect(healthCard).not.toBeNull();
    healthCard?.click();

    expect(onHealthClick).toHaveBeenCalledWith('critical');
  });

  it('FR-023: shows trailing 12-month revenue as sub-value', () => {
    render(<KpiStrip kpiData={mockKpiData} />);
    expect(screen.getByText(/T12M: \$1,200,000/)).toBeInTheDocument();
  });

  it('FR-023: shows accounts managed count', () => {
    render(<KpiStrip kpiData={mockKpiData} />);
    expect(screen.getByText(/42 accounts managed/)).toBeInTheDocument();
  });
});
