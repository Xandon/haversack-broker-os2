'use client';

import Link from 'next/link';
import { useState } from 'react';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { SkeletonTable } from '@/components/shared/skeleton';
import { useAccounts, type Account } from '@/hooks/use-accounts';

export default function AccountListPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useAccounts({ page, limit: 20, search });

  if (error) {
    return <ErrorBanner message="Unable to load accounts" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
        <Link
          href="/accounts/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create Account
        </Link>
      </div>

      <input
        type="text"
        placeholder="Search accounts..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 md:w-80"
      />

      {isLoading ? (
        <SkeletonTable rows={8} />
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          title="No accounts found"
          description={
            search ? 'Try a different search term' : 'Get started by creating your first account'
          }
          action={
            !search ? (
              <Link
                href="/accounts/new"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create Account
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Territory
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Health
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Rep
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.data.map((account: Account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/accounts/${account.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {account.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{account.accountType}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {account.territory?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          (account.healthScore ?? 0) >= 70
                            ? 'bg-green-100 text-green-800'
                            : (account.healthScore ?? 0) >= 40
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {account.healthScore ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {account.assignedRep
                        ? `${account.assignedRep.firstName} ${account.assignedRep.lastName}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {data.data.length} of {data.total} accounts
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={data.data.length < 20}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
