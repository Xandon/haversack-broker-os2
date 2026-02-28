import { useState } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  territory?: { id: string; name: string } | null;
  lastLoginAt: string | null;
}

interface UserListProps {
  users: User[];
  onDeactivate?: (id: string) => void;
  onEdit?: (user: User) => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  rep: 'Sales Rep',
  logistics: 'Logistics',
  viewer: 'Viewer',
};

export function UserList({ users, onDeactivate, onEdit }: UserListProps) {
  const [showInactive, setShowInactive] = useState(false);

  const filtered = showInactive ? users : users.filter((u) => u.isActive);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Users ({filtered.length})</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show inactive
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500" data-testid="empty-state">
          No users found
        </p>
      ) : (
        <table className="w-full text-sm" data-testid="user-table">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2">Name</th>
              <th className="pb-2">Email</th>
              <th className="pb-2">Role</th>
              <th className="pb-2">Territory</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="border-b" data-testid={`user-row-${user.id}`}>
                <td className="py-2">
                  {user.firstName} {user.lastName}
                </td>
                <td className="py-2">{user.email}</td>
                <td className="py-2">
                  <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                </td>
                <td className="py-2">{user.territory?.name ?? '—'}</td>
                <td className="py-2">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                    }`}
                    data-testid={`status-${user.id}`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-2 flex gap-2">
                  {onEdit && (
                    <button
                      className="text-blue-600 hover:underline text-xs"
                      onClick={() => onEdit(user)}
                      data-testid={`edit-${user.id}`}
                    >
                      Edit
                    </button>
                  )}
                  {onDeactivate && user.isActive && (
                    <button
                      className="text-red-600 hover:underline text-xs"
                      onClick={() => onDeactivate(user.id)}
                      data-testid={`deactivate-${user.id}`}
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
