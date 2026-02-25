import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AccountDetail } from '@/components/accounts/account-detail';
import type { AccountDetailData } from '@/components/accounts/account-detail';

// -------------------------------------------------------------------
// Mocks
// -------------------------------------------------------------------

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// -------------------------------------------------------------------
// Fixtures
// -------------------------------------------------------------------

const BASE_ACCOUNT: AccountDetailData = {
  id: 'acc-1',
  name: 'Portland Provisions',
  account_type: 'Store',
  address_line1: '123 Main St',
  address_line2: 'Suite 200',
  city: 'Portland',
  state: 'OR',
  zip_code: '97201',
  phone: '503-555-1234',
  email: 'info@portlandprov.com',
  website: 'https://portlandprov.com',
  notes: 'Great local shop',
  territory_id: 'territory-1',
  assigned_rep_id: 'rep-1',
  tenant_id: 'tenant-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
  health_score: 85,
  health_score_updated_at: '2026-02-24T02:00:00Z',
  contacts: [
    {
      id: 'contact-1',
      name: 'Jane Smith',
      email: 'jane@portlandprov.com',
      phone: '503-555-5678',
      role: 'Buyer',
      is_primary: true,
    },
    {
      id: 'contact-2',
      name: 'Bob Jones',
      email: 'bob@portlandprov.com',
      phone: null,
      role: 'Manager',
      is_primary: false,
    },
  ],
  parent_account: {
    id: 'parent-1',
    name: 'NW Grocery Group',
  },
  child_accounts: [
    {
      id: 'child-1',
      name: 'Portland Provisions Downtown',
      account_type: 'Store',
    },
    {
      id: 'child-2',
      name: 'Portland Provisions Eastside',
      account_type: 'Store',
    },
  ],
  recent_activities: [
    {
      id: 'act-1',
      type: 'Call',
      description: 'Follow-up call with Jane about spring order',
      created_at: '2026-02-20T10:00:00Z',
    },
    {
      id: 'act-2',
      type: 'Email',
      description: 'Sent new product catalog',
      created_at: '2026-02-18T14:30:00Z',
    },
  ],
};

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('T053: AccountDetail component', () => {
  it('FR-002: displays account name and type', () => {
    render(<AccountDetail account={BASE_ACCOUNT} />);

    expect(screen.getByText('Portland Provisions')).toBeDefined();
    // Account type appears in the info card and also in child account items;
    // use getAllByText to handle multiple occurrences.
    const storeTexts = screen.getAllByText('Store');
    expect(storeTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('FR-002: displays address, phone, email, and website', () => {
    render(<AccountDetail account={BASE_ACCOUNT} />);

    expect(screen.getByText(/123 Main St/)).toBeDefined();
    expect(screen.getByText('503-555-1234')).toBeDefined();
    expect(screen.getByText('info@portlandprov.com')).toBeDefined();
    expect(screen.getByText('https://portlandprov.com')).toBeDefined();
  });

  it('FR-002: shows contacts list with primary contact highlighted', () => {
    render(<AccountDetail account={BASE_ACCOUNT} />);

    expect(screen.getByText('Jane Smith')).toBeDefined();
    expect(screen.getByText('Bob Jones')).toBeDefined();
    expect(screen.getByText('Primary')).toBeDefined();
  });

  it('FR-002: shows parent account as link', () => {
    render(<AccountDetail account={BASE_ACCOUNT} />);

    const parentLink = screen.getByText('NW Grocery Group');
    expect(parentLink).toBeDefined();
    expect(parentLink.closest('a')).toBeDefined();
    expect(parentLink.closest('a')?.getAttribute('href')).toBe('/accounts/parent-1');
  });

  it('FR-002: shows child accounts list with links', () => {
    render(<AccountDetail account={BASE_ACCOUNT} />);

    expect(screen.getByText('Portland Provisions Downtown')).toBeDefined();
    expect(screen.getByText('Portland Provisions Eastside')).toBeDefined();

    const childLinks = screen.getAllByText(/Portland Provisions (Downtown|Eastside)/);
    expect(childLinks).toHaveLength(2);
  });

  it('FR-002: shows health score badge', () => {
    render(<AccountDetail account={BASE_ACCOUNT} />);

    // Compact health badge in header
    const healthButton = screen.getByRole('button', { name: /Health score: 85/i });
    expect(healthButton).toBeDefined();
  });

  it('FR-002: shows recent activities summary', () => {
    render(<AccountDetail account={BASE_ACCOUNT} />);

    expect(screen.getByText('Recent Activities')).toBeDefined();
    expect(screen.getByText('Follow-up call with Jane about spring order')).toBeDefined();
    expect(screen.getByText('Sent new product catalog')).toBeDefined();
  });

  it('FR-002: shows edit button linking to edit form', () => {
    render(<AccountDetail account={BASE_ACCOUNT} />);

    const editLink = screen.getByText('Edit Account');
    expect(editLink).toBeDefined();
    expect(editLink.closest('a')?.getAttribute('href')).toBe('/accounts/acc-1/edit');
  });

  it('FR-002: shows "No contacts added" when contacts list is empty', () => {
    const accountWithNoContacts = { ...BASE_ACCOUNT, contacts: [] };
    render(<AccountDetail account={accountWithNoContacts} />);

    expect(screen.getByText('No contacts added.')).toBeDefined();
  });

  it('FR-002: shows "No recent activities" when activities list is empty', () => {
    const accountWithNoActivities = { ...BASE_ACCOUNT, recent_activities: [] };
    render(<AccountDetail account={accountWithNoActivities} />);

    expect(screen.getByText('No recent activities.')).toBeDefined();
  });

  it('FR-002: does not render parent account section when parent is null', () => {
    const accountWithNoParent = { ...BASE_ACCOUNT, parent_account: null };
    render(<AccountDetail account={accountWithNoParent} />);

    expect(screen.queryByText('Parent Account')).toBeNull();
  });

  it('FR-002: does not render child accounts section when list is empty', () => {
    const accountWithNoChildren = { ...BASE_ACCOUNT, child_accounts: [] };
    render(<AccountDetail account={accountWithNoChildren} />);

    expect(screen.queryByText('Child Accounts')).toBeNull();
  });
});
