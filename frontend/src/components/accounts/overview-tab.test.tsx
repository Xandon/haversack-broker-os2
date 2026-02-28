import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OverviewTab } from './overview-tab';
import type { AccountDetail } from '@/hooks/use-account-detail';

const MOCK_ACCOUNT: AccountDetail = {
  id: 'acc-1',
  tenantId: 'tenant-1',
  name: 'Pacific Bistro',
  accountType: 'restaurant',
  streetAddress: '123 Main St',
  city: 'Portland',
  state: 'OR',
  zipCode: '97201',
  territoryId: 'ter-1',
  territory: { id: 'ter-1', name: 'Portland Metro' },
  parentAccountId: null,
  parentAccount: null,
  childAccounts: [],
  contacts: [],
  healthScore: 72,
  healthScoreCalculatedAt: '2026-02-26T02:00:00Z',
  healthScoreBreakdown: {
    daysSinceLastActivity: { value: 5, score: 85, weight: 0.3 },
    orderFrequency: { value: 3, score: 70, weight: 0.25 },
    orderValueTrend: { value: 1.2, score: 65, weight: 0.25 },
    contactEngagement: { value: 10, score: 60, weight: 0.2 },
  },
  isActive: true,
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-02-26T14:00:00Z',
  deletedAt: null,
};

describe('FR-002: OverviewTab component', () => {
  test('FR-002: renders account details card', () => {
    render(<OverviewTab account={MOCK_ACCOUNT} />);
    expect(screen.getByText('Account Details')).toBeDefined();
    expect(screen.getByText('Restaurant')).toBeDefined();
    expect(screen.getByText('Portland Metro')).toBeDefined();
  });

  test('FR-002: renders account address', () => {
    render(<OverviewTab account={MOCK_ACCOUNT} />);
    expect(screen.getByText('123 Main St, Portland, OR 97201')).toBeDefined();
  });

  test('FR-006: renders health score card with breakdown', () => {
    render(<OverviewTab account={MOCK_ACCOUNT} />);
    expect(screen.getByText('Health Score')).toBeDefined();
    expect(screen.getByText('Activity Recency (30%)')).toBeDefined();
    expect(screen.getByText('Order Frequency (25%)')).toBeDefined();
    expect(screen.getByText('Order Value Trend (25%)')).toBeDefined();
    expect(screen.getByText('Contact Engagement (20%)')).toBeDefined();
  });

  test('FR-006: shows pending message when health score is null', () => {
    const noScoreAccount = { ...MOCK_ACCOUNT, healthScore: null, healthScoreBreakdown: null };
    render(<OverviewTab account={noScoreAccount} />);
    expect(screen.getByText(/Pending calculation/)).toBeDefined();
  });

  test('FR-004: renders parent account link when present', () => {
    const childAccount = {
      ...MOCK_ACCOUNT,
      parentAccountId: 'acc-parent',
      parentAccount: { id: 'acc-parent', name: 'Pacific Group' },
    };
    render(<OverviewTab account={childAccount} />);
    expect(screen.getByText('Account Hierarchy')).toBeDefined();
    expect(screen.getByText('Parent Account')).toBeDefined();
    const link = screen.getByText('Pacific Group');
    expect(link.closest('a')?.getAttribute('href')).toBe('/accounts/acc-parent');
  });

  test('FR-004: renders child accounts when present', () => {
    const parentAccount = {
      ...MOCK_ACCOUNT,
      childAccounts: [
        { id: 'acc-child-1', name: 'Pacific Bistro Downtown' },
        { id: 'acc-child-2', name: 'Pacific Bistro Pearl' },
      ],
    };
    render(<OverviewTab account={parentAccount} />);
    expect(screen.getByText('Child Accounts (2)')).toBeDefined();
    expect(screen.getByText('Pacific Bistro Downtown')).toBeDefined();
    expect(screen.getByText('Pacific Bistro Pearl')).toBeDefined();
  });

  test('FR-004: does not render hierarchy card when no parent or children', () => {
    render(<OverviewTab account={MOCK_ACCOUNT} />);
    expect(screen.queryByText('Account Hierarchy')).toBeNull();
  });

  test('FR-002: shows active status', () => {
    render(<OverviewTab account={MOCK_ACCOUNT} />);
    expect(screen.getByText('Active')).toBeDefined();
  });
});
