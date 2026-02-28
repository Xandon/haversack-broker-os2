import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationBell } from './notification-bell';

vi.mock('@/hooks/use-notifications', () => ({
  useNotifications: vi.fn(),
  useMarkNotificationRead: vi.fn(),
  useMarkAllRead: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
}));

import { useNotifications, useMarkNotificationRead, useMarkAllRead } from '@/hooks/use-notifications';
import { useRouter } from 'next/navigation';

const mockNotifications = [
  {
    id: 'n-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    type: 'task_reminder' as const,
    title: 'Task due in 1 hour',
    body: 'Follow up on honey samples',
    referenceId: 'task-1',
    referenceType: 'task',
    isRead: false,
    readAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'n-2',
    tenantId: 'tenant-1',
    userId: 'user-1',
    type: 'order_approved' as const,
    title: 'Order approved',
    body: 'Order ORD-001 has been approved',
    referenceId: 'order-1',
    referenceType: 'order',
    isRead: true,
    readAt: '2026-02-27T12:00:00Z',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // yesterday
  },
];

describe('FR-052: NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMarkNotificationRead).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useMarkNotificationRead>);
    vi.mocked(useMarkAllRead).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useMarkAllRead>);
  });

  test('FR-052: renders bell icon', () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: { data: [], pagination: { page: 1, perPage: 20, totalCount: 0 }, unreadCount: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useNotifications>);

    render(<NotificationBell />);

    expect(screen.getByLabelText('Notifications')).toBeDefined();
  });

  test('FR-052: shows unread count badge', () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: {
        data: mockNotifications,
        pagination: { page: 1, perPage: 20, totalCount: 2 },
        unreadCount: 1,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useNotifications>);

    render(<NotificationBell />);

    expect(screen.getByText('1')).toBeDefined();
  });

  test('FR-052: hides badge when no unread notifications', () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: { data: [], pagination: { page: 1, perPage: 20, totalCount: 0 }, unreadCount: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useNotifications>);

    render(<NotificationBell />);

    // No badge should be visible
    expect(screen.queryByText('0')).toBeNull();
  });

  test('FR-052: opens dropdown on click', () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: {
        data: mockNotifications,
        pagination: { page: 1, perPage: 20, totalCount: 2 },
        unreadCount: 1,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useNotifications>);

    render(<NotificationBell />);

    fireEvent.click(screen.getByLabelText('Notifications'));

    expect(screen.getByText('Task due in 1 hour')).toBeDefined();
    expect(screen.getByText('Order approved')).toBeDefined();
  });

  test('FR-052: groups notifications by date', () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: {
        data: mockNotifications,
        pagination: { page: 1, perPage: 20, totalCount: 2 },
        unreadCount: 1,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useNotifications>);

    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText('Notifications'));

    expect(screen.getByText('Today')).toBeDefined();
    expect(screen.getByText('Yesterday')).toBeDefined();
  });

  test('FR-052: shows mark all read button', () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: {
        data: mockNotifications,
        pagination: { page: 1, perPage: 20, totalCount: 2 },
        unreadCount: 1,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useNotifications>);

    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText('Notifications'));

    expect(screen.getByText('Mark all read')).toBeDefined();
  });

  test('FR-052: mark all read calls mutation', () => {
    const mutateFn = vi.fn();
    vi.mocked(useMarkAllRead).mockReturnValue({
      mutate: mutateFn,
      isPending: false,
    } as unknown as ReturnType<typeof useMarkAllRead>);
    vi.mocked(useNotifications).mockReturnValue({
      data: {
        data: mockNotifications,
        pagination: { page: 1, perPage: 20, totalCount: 2 },
        unreadCount: 1,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useNotifications>);

    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText('Notifications'));
    fireEvent.click(screen.getByText('Mark all read'));

    expect(mutateFn).toHaveBeenCalled();
  });

  test('FR-052: clicking notification navigates to entity', () => {
    const pushFn = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: pushFn } as unknown as ReturnType<typeof useRouter>);
    const markReadFn = vi.fn();
    vi.mocked(useMarkNotificationRead).mockReturnValue({
      mutate: markReadFn,
      isPending: false,
    } as unknown as ReturnType<typeof useMarkNotificationRead>);
    vi.mocked(useNotifications).mockReturnValue({
      data: {
        data: mockNotifications,
        pagination: { page: 1, perPage: 20, totalCount: 2 },
        unreadCount: 1,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useNotifications>);

    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText('Notifications'));
    fireEvent.click(screen.getByText('Task due in 1 hour'));

    expect(markReadFn).toHaveBeenCalledWith('n-1');
    expect(pushFn).toHaveBeenCalledWith('/tasks');
  });

  test('FR-052: shows empty state when no notifications', () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: { data: [], pagination: { page: 1, perPage: 20, totalCount: 0 }, unreadCount: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useNotifications>);

    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText('Notifications'));

    expect(screen.getByText('No notifications')).toBeDefined();
  });
});
