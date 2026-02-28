import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccountDetailHeader } from './account-detail-header';
import type { AccountDetail } from '@/hooks/use-account-detail';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

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
  healthScoreBreakdown: null,
  isActive: true,
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-02-26T14:00:00Z',
  deletedAt: null,
};

describe('FR-002: AccountDetailHeader component', () => {
  test('FR-002: renders account name as heading', () => {
    render(<AccountDetailHeader account={MOCK_ACCOUNT} />);
    expect(screen.getByText('Pacific Bistro')).toBeDefined();
  });

  test('FR-002: renders breadcrumb link to accounts list', () => {
    render(<AccountDetailHeader account={MOCK_ACCOUNT} />);
    const link = screen.getByText('Accounts');
    expect(link).toBeDefined();
    expect(link.closest('a')?.getAttribute('href')).toBe('/accounts');
  });

  test('FR-002: renders account type badge', () => {
    render(<AccountDetailHeader account={MOCK_ACCOUNT} />);
    expect(screen.getByText('Restaurant')).toBeDefined();
  });

  test('FR-002: renders territory name', () => {
    render(<AccountDetailHeader account={MOCK_ACCOUNT} />);
    expect(screen.getByText('Portland Metro')).toBeDefined();
  });

  test('FR-002: renders health score badge', () => {
    render(<AccountDetailHeader account={MOCK_ACCOUNT} />);
    expect(screen.getByText('72')).toBeDefined();
  });

  test('FR-002: renders address', () => {
    render(<AccountDetailHeader account={MOCK_ACCOUNT} />);
    expect(screen.getByText('123 Main St, Portland, OR 97201')).toBeDefined();
  });

  test('FR-002: shows inactive badge when account is not active', () => {
    const inactiveAccount = { ...MOCK_ACCOUNT, isActive: false };
    render(<AccountDetailHeader account={inactiveAccount} />);
    expect(screen.getByText('Inactive')).toBeDefined();
  });

  test('FR-002: renders Edit and New Order buttons', () => {
    render(<AccountDetailHeader account={MOCK_ACCOUNT} />);
    expect(screen.getByText('Edit')).toBeDefined();
    expect(screen.getByText('New Order')).toBeDefined();
  });
});
