import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { ContactsTab } from './contacts-tab';
import type { ContactItem } from '@/hooks/use-account-detail';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

function createWrapper(): React.ComponentType<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const MOCK_CONTACTS: ContactItem[] = [
  {
    id: 'con-1',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@pacific.com',
    phone: '503-555-0100',
    title: 'Head Chef',
    isPrimary: true,
    createdAt: '2026-02-26T10:00:00Z',
    updatedAt: '2026-02-26T10:00:00Z',
  },
  {
    id: 'con-2',
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob@pacific.com',
    phone: null,
    title: 'Purchasing Manager',
    isPrimary: false,
    createdAt: '2026-02-26T11:00:00Z',
    updatedAt: '2026-02-26T11:00:00Z',
  },
];

describe('FR-002: ContactsTab component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-002: renders contact cards', () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(ContactsTab, { accountId: 'acc-1', contacts: MOCK_CONTACTS }),
      ),
    );
    expect(screen.getByText('Jane Smith')).toBeDefined();
    expect(screen.getByText('Bob Johnson')).toBeDefined();
  });

  test('FR-002: shows contact count', () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(ContactsTab, { accountId: 'acc-1', contacts: MOCK_CONTACTS }),
      ),
    );
    expect(screen.getByText('2 contacts')).toBeDefined();
  });

  test('FR-002: shows Primary badge for primary contact', () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(ContactsTab, { accountId: 'acc-1', contacts: MOCK_CONTACTS }),
      ),
    );
    expect(screen.getByText('Primary')).toBeDefined();
  });

  test('FR-002: renders contact details (email, phone, title)', () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(ContactsTab, { accountId: 'acc-1', contacts: MOCK_CONTACTS }),
      ),
    );
    expect(screen.getByText('jane@pacific.com')).toBeDefined();
    expect(screen.getByText('503-555-0100')).toBeDefined();
    expect(screen.getByText('Head Chef')).toBeDefined();
    expect(screen.getByText('Purchasing Manager')).toBeDefined();
  });

  test('FR-002: shows empty state when no contacts', () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(ContactsTab, { accountId: 'acc-1', contacts: [] }),
      ),
    );
    expect(screen.getByText('No contacts yet')).toBeDefined();
  });

  test('FR-002: shows Add Contact button', () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(ContactsTab, { accountId: 'acc-1', contacts: MOCK_CONTACTS }),
      ),
    );
    expect(screen.getByText('Add Contact')).toBeDefined();
  });

  test('FR-002: shows Edit and Delete buttons on each contact card', () => {
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(ContactsTab, { accountId: 'acc-1', contacts: MOCK_CONTACTS }),
      ),
    );
    const editButtons = screen.getAllByText('Edit');
    const deleteButtons = screen.getAllByText('Delete');
    expect(editButtons).toHaveLength(2);
    expect(deleteButtons).toHaveLength(2);
  });

  test('FR-002: opens Add Contact dialog when button clicked', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(ContactsTab, { accountId: 'acc-1', contacts: MOCK_CONTACTS }),
      ),
    );

    await user.click(screen.getByText('Add Contact'));
    expect(screen.getByText('Add a new contact to this account.')).toBeDefined();
  });
});
