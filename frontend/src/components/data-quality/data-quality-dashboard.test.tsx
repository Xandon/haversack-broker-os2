import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { DataQualityDashboard } from './data-quality-dashboard';

import type { DataQualityScorecard } from '@/hooks/use-data-quality';


function makeScorecard(overrides: Partial<DataQualityScorecard> = {}): DataQualityScorecard {
  return {
    metrics: [
      {
        key: 'account_completeness',
        label: 'Accounts with complete required fields',
        value: 80,
        total: 100,
        percentage: 80,
        weight: 25,
      },
      {
        key: 'contact_email_validity',
        label: 'Contacts with valid email format',
        value: 45,
        total: 50,
        percentage: 90,
        weight: 20,
      },
      {
        key: 'product_images',
        label: 'Products with images',
        value: 30,
        total: 60,
        percentage: 50,
        weight: 15,
      },
      {
        key: 'duplicate_accounts',
        label: 'Accounts without duplicates',
        value: 95,
        total: 100,
        percentage: 95,
        weight: 20,
      },
      {
        key: 'stale_accounts',
        label: 'Accounts with recent activity (last 90 days)',
        value: 70,
        total: 100,
        percentage: 70,
        weight: 20,
      },
    ],
    compositeScore: 77,
    calculatedAt: '2026-02-28T03:00:00.000Z',
    ...overrides,
  };
}

describe('DataQualityDashboard', () => {
  it('FR-029: renders composite score prominently', () => {
    render(<DataQualityDashboard scorecard={makeScorecard()} />);
    expect(screen.getByText('77')).toBeInTheDocument();
    expect(screen.getByText('Data Quality Score')).toBeInTheDocument();
  });

  it('FR-029: renders all five quality metrics', () => {
    render(<DataQualityDashboard scorecard={makeScorecard()} />);
    expect(screen.getByText('Accounts with complete required fields')).toBeInTheDocument();
    expect(screen.getByText('Contacts with valid email format')).toBeInTheDocument();
    expect(screen.getByText('Products with images')).toBeInTheDocument();
    expect(screen.getByText('Accounts without duplicates')).toBeInTheDocument();
    expect(screen.getByText('Accounts with recent activity (last 90 days)')).toBeInTheDocument();
  });

  it('FR-029: displays percentage for each metric', () => {
    render(<DataQualityDashboard scorecard={makeScorecard()} />);
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
  });

  it('FR-029: displays value/total for each metric', () => {
    render(<DataQualityDashboard scorecard={makeScorecard()} />);
    expect(screen.getByText('80 of 100')).toBeInTheDocument();
    expect(screen.getByText('45 of 50')).toBeInTheDocument();
    expect(screen.getByText('30 of 60')).toBeInTheDocument();
  });

  it('AC-029a: shows last calculated timestamp', () => {
    render(<DataQualityDashboard scorecard={makeScorecard()} />);
    expect(screen.getByText(/Last calculated:/)).toBeInTheDocument();
  });

  it('AC-029b: calls onMetricClick when metric is clicked', () => {
    const onMetricClick = vi.fn();
    render(<DataQualityDashboard scorecard={makeScorecard()} onMetricClick={onMetricClick} />);
    fireEvent.click(screen.getByText('Accounts with complete required fields'));
    expect(onMetricClick).toHaveBeenCalledWith('account_completeness');
  });

  it('FR-029: shows "Good" label for score >= 80', () => {
    render(<DataQualityDashboard scorecard={makeScorecard({ compositeScore: 85 })} />);
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('FR-029: shows "Needs Improvement" label for score 50-79', () => {
    render(<DataQualityDashboard scorecard={makeScorecard({ compositeScore: 65 })} />);
    expect(screen.getByText('Needs Improvement')).toBeInTheDocument();
  });

  it('FR-029: shows "Critical" label for score < 50', () => {
    render(<DataQualityDashboard scorecard={makeScorecard({ compositeScore: 35 })} />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('FR-029: renders progress bars with correct aria values', () => {
    render(<DataQualityDashboard scorecard={makeScorecard()} />);
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(5);
    expect(progressBars[0]).toHaveAttribute('aria-valuenow', '80');
  });
});
