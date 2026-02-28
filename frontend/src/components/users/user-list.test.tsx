import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UserList } from './user-list.js';

const mockUsers = [
  {
    id: '1',
    email: 'admin@haversack.com',
    firstName: 'Alice',
    lastName: 'Admin',
    role: 'admin',
    isActive: true,
    territory: null,
    lastLoginAt: '2026-01-15T10:00:00Z',
  },
  {
    id: '2',
    email: 'rep@haversack.com',
    firstName: 'Bob',
    lastName: 'Rep',
    role: 'rep',
    isActive: true,
    territory: { id: 't1', name: 'Portland' },
    lastLoginAt: null,
  },
  {
    id: '3',
    email: 'inactive@haversack.com',
    firstName: 'Carol',
    lastName: 'Gone',
    role: 'viewer',
    isActive: false,
    territory: null,
    lastLoginAt: null,
  },
];

describe('UserList', () => {
  it('FR-026: renders active users by default', () => {
    render(<UserList users={mockUsers} />);

    expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    expect(screen.getByText('Bob Rep')).toBeInTheDocument();
    expect(screen.queryByText('Carol Gone')).not.toBeInTheDocument();
  });

  it('FR-026: shows inactive users when toggled', async () => {
    const user = userEvent.setup();
    render(<UserList users={mockUsers} />);

    await user.click(screen.getByLabelText('Show inactive'));

    expect(screen.getByText('Carol Gone')).toBeInTheDocument();
  });

  it('FR-026: displays role badges', () => {
    render(<UserList users={mockUsers} />);

    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Sales Rep')).toBeInTheDocument();
  });

  it('FR-026: displays territory names', () => {
    render(<UserList users={mockUsers} />);

    expect(screen.getByText('Portland')).toBeInTheDocument();
  });

  it('FR-026: shows active/inactive status badges', () => {
    render(<UserList users={mockUsers} />);

    expect(screen.getByTestId('status-1')).toHaveTextContent('Active');
    expect(screen.getByTestId('status-2')).toHaveTextContent('Active');
  });

  it('FR-026: calls onDeactivate when deactivate clicked', async () => {
    const user = userEvent.setup();
    const onDeactivate = vi.fn();
    render(<UserList users={mockUsers} onDeactivate={onDeactivate} />);

    await user.click(screen.getByTestId('deactivate-1'));

    expect(onDeactivate).toHaveBeenCalledWith('1');
  });

  it('FR-026: calls onEdit when edit clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<UserList users={mockUsers} onEdit={onEdit} />);

    await user.click(screen.getByTestId('edit-1'));

    expect(onEdit).toHaveBeenCalledWith(mockUsers[0]);
  });

  it('FR-026: shows empty state when no users', () => {
    render(<UserList users={[]} />);

    expect(screen.getByTestId('empty-state')).toHaveTextContent('No users found');
  });
});
