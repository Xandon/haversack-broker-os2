'use client';

import { clsx } from 'clsx';

import type { Activity, ActivityType } from '@/hooks/use-activities';
import { EmptyState } from '@/components/shared/empty-state';
import { SkeletonLoader } from '@/components/shared/skeleton-loader';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface ActivityTimelineProps {
  activities: Activity[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

// -------------------------------------------------------------------
// Activity type icon SVG paths
// -------------------------------------------------------------------

interface IconConfig {
  path: string;
  bgColor: string;
  iconColor: string;
  label: string;
}

const ACTIVITY_ICONS: Record<ActivityType, IconConfig> = {
  visit: {
    // map-pin
    path: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    label: 'Visit',
  },
  call: {
    // phone
    path: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z',
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    label: 'Call',
  },
  email: {
    // mail / envelope
    path: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
    label: 'Email',
  },
  demo: {
    // beaker
    path: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l.01.104c.135 1.738-1.162 3.282-2.907 3.455A48.899 48.899 0 0112 19.5a48.899 48.899 0 01-4.903-.341c-1.745-.173-3.042-1.717-2.907-3.455L5 14.5',
    bgColor: 'bg-orange-100',
    iconColor: 'text-orange-600',
    label: 'Demo',
  },
  sampling: {
    // gift
    path: 'M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
    bgColor: 'bg-pink-100',
    iconColor: 'text-pink-600',
    label: 'Sampling',
  },
  note: {
    // file-text
    path: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
    bgColor: 'bg-gray-100',
    iconColor: 'text-gray-600',
    label: 'Note',
  },
};

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function formatActivityDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatActivityTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(minutes: number | null): string | null {
  if (minutes == null || minutes <= 0) {
    return null;
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

// -------------------------------------------------------------------
// ActivityTimelineItem
// -------------------------------------------------------------------

interface ActivityTimelineItemProps {
  activity: Activity;
  isLast: boolean;
}

function ActivityTimelineItem({ activity, isLast }: ActivityTimelineItemProps): React.JSX.Element {
  const iconConfig = ACTIVITY_ICONS[activity.activity_type];
  const duration = formatDuration(activity.duration_minutes);

  return (
    <div className="relative flex gap-4 pb-6">
      {/* Timeline connector line */}
      {!isLast ? (
        <div
          className="absolute left-5 top-10 h-full w-0.5 bg-gray-200"
          aria-hidden="true"
        />
      ) : null}

      {/* Icon */}
      <div
        className={clsx(
          'relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
          iconConfig.bgColor,
        )}
        aria-label={iconConfig.label}
      >
        <svg
          className={clsx('h-5 w-5', iconConfig.iconColor)}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={iconConfig.path} />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">
            {activity.subject}
          </span>
          <span
            className={clsx(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              iconConfig.bgColor,
              iconConfig.iconColor,
            )}
          >
            {iconConfig.label}
          </span>
        </div>

        {activity.notes ? (
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{activity.notes}</p>
        ) : null}

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span>{activity.user_name}</span>
          <span>
            {formatActivityDate(activity.created_at)} at{' '}
            {formatActivityTime(activity.created_at)}
          </span>
          {duration ? <span>{duration}</span> : null}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function ActivityTimeline({
  activities,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: ActivityTimelineProps): React.JSX.Element {
  // Initial loading state
  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="activity-timeline-skeleton">
        <SkeletonLoader variant="card" count={3} />
      </div>
    );
  }

  // Empty state
  if (activities.length === 0) {
    return (
      <EmptyState
        title="No activities yet"
        description="Log your first activity to start building a timeline."
      />
    );
  }

  return (
    <div className="flow-root" role="list" aria-label="Activity timeline">
      {activities.map((activity, index) => (
        <div key={activity.id} role="listitem">
          <ActivityTimelineItem
            activity={activity}
            isLast={index === activities.length - 1 && !hasNextPage}
          />
        </div>
      ))}

      {/* Load more button */}
      {hasNextPage ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading...' : 'Load more'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
