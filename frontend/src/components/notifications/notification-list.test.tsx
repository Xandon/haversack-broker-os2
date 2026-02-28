import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { NotificationList } from './notification-list';

import type { Notification } from '@/hooks/use-notifications';


function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: '1',
    type: 'task_reminder',
    title: 'Task due soon',
    body: 'Follow up call is due in 1 hour',
    linkUrl: '/tasks/1',
    isRead: false,
    readAt: null,
    metadata: {},
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('NotificationList', () => {
  it('FR-009: renders empty state when no notifications', () => {
    render(<NotificationList notifications={[]} onMarkRead={vi.fn()} onMarkAllRead={vi.fn()} />);
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('FR-009: renders list of notifications', () => {
    const notifications = [
      makeNotification({ id: '1', title: 'Task due soon' }),
      makeNotification({ id: '2', title: 'Order approved', type: 'order_approval' }),
    ];
    render(
      <NotificationList
        notifications={notifications}
        onMarkRead={vi.fn()}
        onMarkAllRead={vi.fn()}
      />,
    );
    expect(screen.getByText('Task due soon')).toBeInTheDocument();
    expect(screen.getByText('Order approved')).toBeInTheDocument();
  });

  it('FR-009: shows "Mark all read" button when unread notifications exist', () => {
    const notifications = [makeNotification({ isRead: false })];
    render(
      <NotificationList
        notifications={notifications}
        onMarkRead={vi.fn()}
        onMarkAllRead={vi.fn()}
      />,
    );
    expect(screen.getByText('Mark all read')).toBeInTheDocument();
  });

  it('FR-009: hides "Mark all read" button when all are read', () => {
    const notifications = [makeNotification({ isRead: true })];
    render(
      <NotificationList
        notifications={notifications}
        onMarkRead={vi.fn()}
        onMarkAllRead={vi.fn()}
      />,
    );
    expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
  });

  it('FR-009: calls onMarkAllRead when button clicked', () => {
    const onMarkAllRead = vi.fn();
    render(
      <NotificationList
        notifications={[makeNotification()]}
        onMarkRead={vi.fn()}
        onMarkAllRead={onMarkAllRead}
      />,
    );
    fireEvent.click(screen.getByText('Mark all read'));
    expect(onMarkAllRead).toHaveBeenCalledOnce();
  });

  it('FR-009: calls onMarkRead when unread notification is clicked', () => {
    const onMarkRead = vi.fn();
    render(
      <NotificationList
        notifications={[makeNotification({ id: 'n1', isRead: false })]}
        onMarkRead={onMarkRead}
        onMarkAllRead={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Task due soon'));
    expect(onMarkRead).toHaveBeenCalledWith('n1');
  });

  it('FR-009: does not call onMarkRead when already-read notification is clicked', () => {
    const onMarkRead = vi.fn();
    render(
      <NotificationList
        notifications={[makeNotification({ isRead: true })]}
        onMarkRead={onMarkRead}
        onMarkAllRead={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Task due soon'));
    expect(onMarkRead).not.toHaveBeenCalled();
  });

  it('FR-009: shows notification type badge', () => {
    render(
      <NotificationList
        notifications={[makeNotification({ type: 'order_approval' })]}
        onMarkRead={vi.fn()}
        onMarkAllRead={vi.fn()}
      />,
    );
    expect(screen.getByText('Approval')).toBeInTheDocument();
  });

  it('FR-009: shows notification body text', () => {
    render(
      <NotificationList
        notifications={[makeNotification({ body: 'Important update details' })]}
        onMarkRead={vi.fn()}
        onMarkAllRead={vi.fn()}
      />,
    );
    expect(screen.getByText('Important update details')).toBeInTheDocument();
  });

  it('FR-009: calls onNotificationClick with notification data', () => {
    const onNotificationClick = vi.fn();
    const notification = makeNotification({ id: 'n1' });
    render(
      <NotificationList
        notifications={[notification]}
        onMarkRead={vi.fn()}
        onMarkAllRead={vi.fn()}
        onNotificationClick={onNotificationClick}
      />,
    );
    fireEvent.click(screen.getByText('Task due soon'));
    expect(onNotificationClick).toHaveBeenCalledWith(notification);
  });
});
