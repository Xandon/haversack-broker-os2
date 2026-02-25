'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { EmptyState } from '@/components/shared/empty-state';

export default function AccountsPage(): React.JSX.Element {
  const router = useRouter();

  const handleCreateAccount = useCallback((): void => {
    router.push('/accounts/new');
  }, [router]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
        <button
          type="button"
          onClick={handleCreateAccount}
          className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          New Account
        </button>
      </div>
      <div className="mt-8">
        <EmptyState
          title="No accounts yet"
          description="Get started by creating your first account."
          action={{
            label: 'Create Account',
            onClick: handleCreateAccount,
          }}
        />
      </div>
    </div>
  );
}
