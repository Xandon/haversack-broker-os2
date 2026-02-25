'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { AccountDetail } from '@/components/accounts/account-detail';
import type { AccountDetailData } from '@/components/accounts/account-detail';
import { EmptyState } from '@/components/shared/empty-state';
import { SkeletonLoader } from '@/components/shared/skeleton-loader';
import { useAccount } from '@/hooks/use-accounts';

// -------------------------------------------------------------------
// Page component
// -------------------------------------------------------------------

export default function AccountDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const accountId = params.id ?? '';
  const { account, isLoading, isError, error } = useAccount(accountId);

  // Loading state — skeleton loaders
  if (isLoading) {
    return (
      <div>
        {/* Breadcrumbs skeleton */}
        <div className="mb-6">
          <SkeletonLoader variant="text" className="h-4 w-48" />
        </div>
        {/* Title skeleton */}
        <div className="mb-6">
          <SkeletonLoader variant="text" className="h-8 w-64" />
        </div>
        {/* Content skeleton */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <SkeletonLoader variant="card" className="h-64" />
            <SkeletonLoader variant="card" className="h-24" />
            <SkeletonLoader variant="card" className="h-48" />
          </div>
          <div className="space-y-6">
            <SkeletonLoader variant="card" className="h-48" />
            <SkeletonLoader variant="card" className="h-24" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    const is404 = error?.message?.includes('404') || error?.message?.includes('not found');
    return (
      <div>
        <div className="mb-6">
          <Link
            href="/accounts"
            className="inline-flex min-h-[44px] items-center gap-1 rounded text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Back to accounts list"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Accounts
          </Link>
        </div>
        <EmptyState
          title={is404 ? 'Account not found' : 'Error loading account'}
          description={
            is404
              ? 'The account you are looking for does not exist or has been removed.'
              : 'An error occurred while loading the account. Please try again.'
          }
        />
      </div>
    );
  }

  // No account data
  if (!account) {
    return (
      <div>
        <div className="mb-6">
          <Link
            href="/accounts"
            className="inline-flex min-h-[44px] items-center gap-1 rounded text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Back to accounts list"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Accounts
          </Link>
        </div>
        <EmptyState
          title="Account not found"
          description="The account you are looking for does not exist or has been removed."
        />
      </div>
    );
  }

  // Cast to AccountDetailData — the API may return extended fields.
  // Provide defaults for any fields that may not be present on a basic Account.
  const accountData: AccountDetailData = {
    ...account,
    health_score: (account as AccountDetailData).health_score ?? null,
    health_score_updated_at: (account as AccountDetailData).health_score_updated_at ?? null,
    contacts: (account as AccountDetailData).contacts ?? [],
    parent_account: (account as AccountDetailData).parent_account ?? null,
    child_accounts: (account as AccountDetailData).child_accounts ?? [],
    recent_activities: (account as AccountDetailData).recent_activities ?? [],
  };

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link
              href="/accounts"
              className="hover:text-gray-700 hover:underline"
            >
              Accounts
            </Link>
          </li>
          <li aria-hidden="true">
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </li>
          <li className="font-medium text-gray-900" aria-current="page">
            {accountData.name}
          </li>
        </ol>
      </nav>

      <AccountDetail account={accountData} />
    </div>
  );
}
