import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ContactList } from './contact-list';

const mockContacts = [
  {
    id: '1',
    accountId: 'acc-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '503-555-1234',
    title: 'Buyer',
    isPrimary: true,
    optOutEmail: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: '2',
    accountId: 'acc-1',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    isPrimary: false,
    optOutEmail: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

describe('ContactList', () => {
  it('FR-002: renders empty state when no contacts', () => {
    render(<ContactList contacts={[]} />);
    expect(screen.getByText(/no contacts yet/i)).toBeInTheDocument();
  });

  it('FR-002: renders contact names and details', () => {
    render(<ContactList contacts={mockContacts} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('503-555-1234')).toBeInTheDocument();
    expect(screen.getByText('Buyer')).toBeInTheDocument();
  });

  it('FR-002: shows primary contact indicator', () => {
    render(<ContactList contacts={mockContacts} />);

    // Primary contact (John) should have the star icon
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(2);
  });

  it('FR-002: calls onDelete when delete button clicked', async () => {
    const onDelete = vi.fn();
    render(<ContactList contacts={mockContacts} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(deleteButtons[0]);

    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('FR-002: shows initials avatar', () => {
    render(<ContactList contacts={mockContacts} />);

    expect(screen.getByText('JD')).toBeInTheDocument();
    expect(screen.getByText('JS')).toBeInTheDocument();
  });
});
