import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import UserManagementPage from './page';

vi.mock('@/hooks/use-users', () => ({
  useUsers: vi.fn(),
}));

vi.mock('@/components/users/user-list', () => ({
  UserList: ({ users }: { users: unknown[] }) => (
    <div data-testid="user-list">Users: {users.length}</div>
  ),
}));

import { useUsers } from '@/hooks/use-users';

const mockUseUsers = vi.mocked(useUsers);

const mockUsers = {
  data: [
    {
      id: 'u1',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      role: 'rep',
    },
  ],
};

describe('UserManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-P016: renders "User Management" heading', () => {
    mockUseUsers.mockReturnValue({
      data: mockUsers,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUsers>);

    render(<UserManagementPage />);

    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('FR-P016: shows skeleton table when loading', () => {
    mockUseUsers.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUsers>);

    render(<UserManagementPage />);

    const skeletons = screen.getAllByRole('status');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('FR-P016: shows error banner on error', () => {
    mockUseUsers.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('fail'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUsers>);

    render(<UserManagementPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Unable to load users')).toBeInTheDocument();
  });

  it('FR-P016: shows empty state when no users exist', () => {
    mockUseUsers.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUsers>);

    render(<UserManagementPage />);

    expect(screen.getByText('No users')).toBeInTheDocument();
    expect(screen.getByText('Invite your first team member')).toBeInTheDocument();
  });

  it('FR-P016: renders UserList on success with user data', () => {
    mockUseUsers.mockReturnValue({
      data: mockUsers,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUsers>);

    render(<UserManagementPage />);

    expect(screen.getByTestId('user-list')).toBeInTheDocument();
    expect(screen.getByText('Users: 1')).toBeInTheDocument();
  });

  it('FR-P016: error state shows retry button', () => {
    const mockRefetch = vi.fn();
    mockUseUsers.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('fail'),
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useUsers>);

    render(<UserManagementPage />);

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
