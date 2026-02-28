'use client';

import * as React from 'react';
import { PageHeader } from '@/components/patterns/page-header';
import { DataTable } from '@/components/patterns/data-table';
import { ErrorState } from '@/components/patterns/error-state';
import { EmptyState } from '@/components/patterns/empty-state';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { activityColumns } from '@/components/activities/activity-columns';
import { ActivityFilterBar, type ActivityFilters } from '@/components/activities/activity-filters';
import { useActivities } from '@/hooks/use-activities';
import { useAccounts, type AccountListItem } from '@/hooks/use-accounts';

function ActivityListSkeleton(): React.ReactElement {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export default function ActivitiesPage(): React.ReactElement {
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>('');
  const [filters, setFilters] = React.useState<ActivityFilters>({});

  const { data: accountsData, isLoading: accountsLoading } = useAccounts({ limit: 100 });

  const {
    data: activitiesData,
    isLoading: activitiesLoading,
    isError,
    refetch,
  } = useActivities({
    accountId: selectedAccountId,
    type: filters.type,
  });

  const accounts: AccountListItem[] = accountsData?.data ?? [];
  const total = activitiesData?.pagination.total ?? 0;

  if (isError && selectedAccountId) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Activities" />
        <ErrorState
          title="Failed to load activities"
          message="There was an error loading activities. Please try again."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Activities" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label htmlFor="account-select" className="sr-only">Select account</label>
          {accountsLoading ? (
            <Skeleton className="h-10 w-64" />
          ) : (
            <Select
              id="account-select"
              value={selectedAccountId}
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
                setFilters({});
              }}
              className="w-64"
            >
              <option value="">Select an account…</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          )}
        </div>

        {selectedAccountId && (
          <ActivityFilterBar filters={filters} onFilterChange={setFilters} />
        )}
      </div>

      {!selectedAccountId ? (
        <EmptyState
          title="Select an account"
          description="Choose an account from the dropdown above to view its activities."
        />
      ) : activitiesLoading ? (
        <ActivityListSkeleton />
      ) : activitiesData && activitiesData.data.length === 0 ? (
        <EmptyState
          title="No activities"
          description={
            filters.type
              ? `No ${filters.type} activities found for this account. Try a different filter.`
              : 'No activities recorded for this account yet.'
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {activitiesData?.data.length ?? 0} of {total} activities
          </p>
          <DataTable
            columns={activityColumns}
            data={activitiesData?.data ?? []}
            pageSize={20}
          />
        </>
      )}
    </div>
  );
}
