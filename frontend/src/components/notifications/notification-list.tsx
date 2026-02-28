'use client';

import { NotificationItem } from './notification-item';

import type { Notification } from '@/hooks/use-notifications';


interface NotificationListProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

export function NotificationList({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onNotificationClick,
}: NotificationListProps) {
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
        {hasUnread && (
          <button
            type="button"
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
            onClick={onMarkAllRead}
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">No notifications</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={onMarkRead}
                onClick={onNotificationClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
