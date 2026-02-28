'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { SkeletonTable } from '@/components/shared/skeleton';
import { UserList } from '@/components/users/user-list';
import { useUsers } from '@/hooks/use-users';

export default function UserManagementPage() {
  const { data, isLoading, error, refetch } = useUsers(true);

  if (error) {
    return <ErrorBanner message="Unable to load users" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">User Management</h1>

      {isLoading ? (
        <SkeletonTable rows={6} />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No users" description="Invite your first team member" />
      ) : (
        <UserList users={data.data} onDeactivate={() => {}} onEdit={() => {}} />
      )}
    </div>
  );
}
