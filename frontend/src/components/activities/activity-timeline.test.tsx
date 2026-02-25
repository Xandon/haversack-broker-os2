import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ActivityTimeline } from '@/components/activities/activity-timeline';
import type { Activity } from '@/hooks/use-activities';

// -------------------------------------------------------------------
// Test data
// -------------------------------------------------------------------

function createMockActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    account_id: 'acc-1',
    contact_id: null,
    user_id: 'user-1',
    user_name: 'Jane Smith',
    activity_type: 'visit',
    subject: 'Store visit — new product pitch',
    notes: 'Discussed seasonal offerings',
    duration_minutes: 45,
    product_demoed: null,
    quantity_sampled: null,
    buyer_feedback: null,
    products: null,
    activity_date: '2026-02-25',
    created_at: '2026-02-25T10:30:00Z',
    updated_at: '2026-02-25T10:30:00Z',
    ...overrides,
  };
}

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('T071: ActivityTimeline component', () => {
  it('FR-008: renders skeleton loader when loading', () => {
    render(
      <ActivityTimeline
        activities={[]}
        isLoading={true}
        hasNextPage={false}
        isFetchingNextPage={false}
        onLoadMore={vi.fn()}
      />,
    );

    expect(screen.getByTestId('activity-timeline-skeleton')).toBeDefined();
  });

  it('FR-008: renders empty state when no activities', () => {
    render(
      <ActivityTimeline
        activities={[]}
        isLoading={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        onLoadMore={vi.fn()}
      />,
    );

    expect(screen.getByText('No activities yet')).toBeDefined();
    expect(
      screen.getByText('Log your first activity to start building a timeline.'),
    ).toBeDefined();
  });

  it('FR-008: renders activities with subject, user, and date', () => {
    const activities = [
      createMockActivity({ id: 'act-1', subject: 'Morning visit' }),
      createMockActivity({
        id: 'act-2',
        activity_type: 'call',
        subject: 'Follow-up call',
        user_name: 'Bob Jones',
      }),
    ];

    render(
      <ActivityTimeline
        activities={activities}
        isLoading={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        onLoadMore={vi.fn()}
      />,
    );

    expect(screen.getByText('Morning visit')).toBeDefined();
    expect(screen.getByText('Follow-up call')).toBeDefined();
    expect(screen.getByText('Jane Smith')).toBeDefined();
    expect(screen.getByText('Bob Jones')).toBeDefined();
  });

  it('FR-008: shows type-specific badges for each activity', () => {
    const activities = [
      createMockActivity({ id: 'act-1', activity_type: 'visit' }),
      createMockActivity({ id: 'act-2', activity_type: 'email', subject: 'Product follow-up' }),
      createMockActivity({ id: 'act-3', activity_type: 'demo', subject: 'Cheese demo' }),
    ];

    render(
      <ActivityTimeline
        activities={activities}
        isLoading={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        onLoadMore={vi.fn()}
      />,
    );

    expect(screen.getByText('Visit')).toBeDefined();
    expect(screen.getByText('Email')).toBeDefined();
    expect(screen.getByText('Demo')).toBeDefined();
  });

  it('FR-008: shows duration when present', () => {
    const activities = [
      createMockActivity({ id: 'act-1', duration_minutes: 45 }),
    ];

    render(
      <ActivityTimeline
        activities={activities}
        isLoading={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        onLoadMore={vi.fn()}
      />,
    );

    expect(screen.getByText('45m')).toBeDefined();
  });

  it('FR-008: formats duration in hours and minutes for longer activities', () => {
    const activities = [
      createMockActivity({ id: 'act-1', duration_minutes: 90 }),
    ];

    render(
      <ActivityTimeline
        activities={activities}
        isLoading={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        onLoadMore={vi.fn()}
      />,
    );

    expect(screen.getByText('1h 30m')).toBeDefined();
  });

  it('FR-008: renders "Load more" button when hasNextPage is true', () => {
    const activities = [createMockActivity()];

    render(
      <ActivityTimeline
        activities={activities}
        isLoading={false}
        hasNextPage={true}
        isFetchingNextPage={false}
        onLoadMore={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Load more/i })).toBeDefined();
  });

  it('FR-008: calls onLoadMore when "Load more" button is clicked', async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    const activities = [createMockActivity()];

    render(
      <ActivityTimeline
        activities={activities}
        isLoading={false}
        hasNextPage={true}
        isFetchingNextPage={false}
        onLoadMore={onLoadMore}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Load more/i }));

    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('FR-008: shows "Loading..." on Load more button when fetching next page', () => {
    const activities = [createMockActivity()];

    render(
      <ActivityTimeline
        activities={activities}
        isLoading={false}
        hasNextPage={true}
        isFetchingNextPage={true}
        onLoadMore={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Loading/i })).toBeDefined();
  });

  it('FR-008: has accessible role=list on the timeline', () => {
    const activities = [createMockActivity()];

    render(
      <ActivityTimeline
        activities={activities}
        isLoading={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        onLoadMore={vi.fn()}
      />,
    );

    expect(screen.getByRole('list', { name: /Activity timeline/i })).toBeDefined();
  });
});
