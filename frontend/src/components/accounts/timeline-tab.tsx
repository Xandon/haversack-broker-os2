'use client';

import * as React from 'react';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/patterns/error-state';
import { EmptyState } from '@/components/patterns/empty-state';
import { StatusBadge } from '@/components/patterns/status-badge';
import { useAccountActivities, type TimelineItem } from '@/hooks/use-account-activities';

interface TimelineTabProps {
  accountId: string;
}

const ACTIVITY_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'visit', label: 'Visit' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'demo', label: 'Demo' },
  { value: 'sampling', label: 'Sampling' },
];

function TimelineItemCard({ item }: { item: TimelineItem }): React.ReactElement {
  const data = item.data;
  const occurredAt = new Date(item.occurredAt);
  const formattedDate = occurredAt.toLocaleDateString();
  const formattedTime = occurredAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const user = data['user'] as { firstName?: string; lastName?: string } | undefined;
  const userName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '';

  return (
    <div className="flex gap-4 border-l-2 border-muted pl-4 pb-6 last:pb-0">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <StatusBadge status={item.type} />
          {item.type === 'activity' && data['type'] && (
            <StatusBadge status={data['type'] as string} />
          )}
          {item.type === 'task' && data['priority'] && (
            <StatusBadge status={data['priority'] as string} />
          )}
        </div>

        {item.type === 'activity' && data['notes'] && (
          <p className="text-sm">{data['notes'] as string}</p>
        )}
        {item.type === 'email' && (
          <p className="text-sm">{data['subject'] as string}</p>
        )}
        {item.type === 'task' && (
          <p className="text-sm">{data['title'] as string}</p>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formattedDate} at {formattedTime}</span>
          {userName && (
            <>
              <span>by</span>
              <span>{userName}</span>
            </>
          )}
          {item.type === 'activity' && data['durationMinutes'] && (
            <span>({data['durationMinutes'] as number} min)</span>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineSkeleton(): React.ReactElement {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 border-l-2 border-muted pl-4 pb-6">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-full max-w-sm" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TimelineTab({ accountId }: TimelineTabProps): React.ReactElement {
  const [activityType, setActivityType] = React.useState<string | undefined>(undefined);

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAccountActivities({
    accountId,
    activityType,
    limit: 20,
  });

  const allItems = React.useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );

  const totalCount = data?.pages[0]?.pagination.total ?? 0;

  if (isLoading) {
    return <TimelineSkeleton />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load timeline"
        message="There was an error loading the activity timeline."
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount} timeline item{totalCount !== 1 ? 's' : ''}
        </p>
        <Select
          value={activityType ?? 'all'}
          onChange={(e) => setActivityType(e.target.value === 'all' ? undefined : e.target.value)}
          className="w-36"
        >
          {ACTIVITY_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {allItems.length === 0 ? (
        <EmptyState
          title="No timeline activity"
          message={
            activityType
              ? `No ${activityType} activities found. Try a different filter.`
              : 'No activities, emails, or tasks recorded for this account yet.'
          }
        />
      ) : (
        <div className="space-y-0">
          {allItems.map((item) => (
            <TimelineItemCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
}
