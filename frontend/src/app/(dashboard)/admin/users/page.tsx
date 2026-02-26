'use client';

import { useCallback, useState } from 'react';
import { clsx } from 'clsx';

import {
  useUsers,
  useCreateUser,
  useDeactivateUser,
  useReactivateUser,
  type UserRole,
  type UserListFilters,
} from '@/hooks/use-users';
import { SkeletonLoader } from '@/components/shared/skeleton-loader';
import { EmptyState } from '@/components/shared/empty-state';

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------

const ROLE_OPTIONS: Array<{ value: UserRole | 'all'; label: string }> = [
  { value: 'all', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'rep', label: 'Rep' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'viewer', label: 'Viewer' },
];

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

function getRoleBadgeClasses(role: string): string {
  switch (role) {
    case 'admin':
      return 'bg-purple-100 text-purple-700';
    case 'manager':
      return 'bg-blue-100 text-blue-700';
    case 'rep':
      return 'bg-green-100 text-green-700';
    case 'logistics':
      return 'bg-yellow-100 text-yellow-700';
    case 'viewer':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

// -------------------------------------------------------------------
// Create User Form
// -------------------------------------------------------------------

interface CreateUserFormProps {
  onSubmit: (data: {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    role: UserRole;
  }) => void;
  isLoading: boolean;
}

function CreateUserForm({ onSubmit, isLoading }: CreateUserFormProps): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('rep');

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    onSubmit({ email, first_name: firstName, last_name: lastName, password, role });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
            First Name
          </label>
          <input
            id="first_name"
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
            Last Name
          </label>
          <input
            id="last_name"
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password (min 12 characters)
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={12}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
          Role
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="rep">Rep</option>
          <option value="logistics">Logistics</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}

// -------------------------------------------------------------------
// Page Component
// -------------------------------------------------------------------

export default function AdminUsersPage(): React.JSX.Element {
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const filters: UserListFilters = {
    role: roleFilter === 'all' ? undefined : roleFilter,
    is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
    search: searchQuery || undefined,
  };

  const { users, isLoading, isError, error } = useUsers(filters);
  const { createUser, isLoading: isCreating } = useCreateUser();
  const { deactivateUser } = useDeactivateUser();
  const { reactivateUser } = useReactivateUser();

  const handleCreate = useCallback(
    (data: { email: string; first_name: string; last_name: string; password: string; role: UserRole }): void => {
      createUser(data);
      setShowCreateForm(false);
    },
    [createUser],
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage user accounts, roles, and access.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {showCreateForm ? 'Cancel' : 'New User'}
        </button>
      </div>

      {/* Create user form */}
      {showCreateForm ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Create new user</h2>
          <CreateUserForm onSubmit={handleCreate} isLoading={isCreating} />
        </div>
      ) : null}

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="min-h-[44px] flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRoleFilter(opt.value)}
              className={clsx(
                'inline-flex min-h-[44px] items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                roleFilter === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={clsx(
                'inline-flex min-h-[44px] items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                statusFilter === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="mt-6">
          <SkeletonLoader variant="card" count={3} />
        </div>
      ) : null}

      {/* Error state */}
      {isError ? (
        <div className="mt-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Failed to load users: {error?.message ?? 'Unknown error'}
          </p>
        </div>
      ) : null}

      {/* Empty state */}
      {!isLoading && !isError && users.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No users found"
            description="No users match the current filters."
          />
        </div>
      ) : null}

      {/* User list */}
      {!isLoading && !isError && users.length > 0 ? (
        <ul className="mt-6 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm" role="list">
          {users.map((user) => (
            <li
              key={user.id}
              className={clsx(
                'flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between',
                !user.is_active && 'bg-gray-50 opacity-75',
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {user.first_name} {user.last_name}
                  </span>
                  <span
                    className={clsx(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      getRoleBadgeClasses(user.role),
                    )}
                  >
                    {user.role}
                  </span>
                  {!user.is_active ? (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Inactive
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-gray-500">{user.email}</p>
              </div>

              <div className="flex gap-2">
                {user.is_active ? (
                  <button
                    type="button"
                    onClick={() => deactivateUser(user.id)}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => reactivateUser(user.id)}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-green-300 bg-white px-3 py-2 text-sm font-medium text-green-700 shadow-sm hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
