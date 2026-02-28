'use client';

import type { Notification } from '@/hooks/use-notifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onClick?: (notification: Notification) => void;
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    task_reminder: 'Task',
    order_approval: 'Approval',
    commission_approval: 'Commission',
    system: 'System',
    mention: 'Mention',
  };
  return labels[type] ?? type;
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    task_reminder: 'bg-amber-100 text-amber-700',
    order_approval: 'bg-purple-100 text-purple-700',
    commission_approval: 'bg-green-100 text-green-700',
    system: 'bg-gray-100 text-gray-700',
    mention: 'bg-blue-100 text-blue-700',
  };
  return colors[type] ?? 'bg-gray-100 text-gray-700';
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function NotificationItem({ notification, onMarkRead, onClick }: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.isRead) {
      onMarkRead(notification.id);
    }
    onClick?.(notification);
  };

  return (
    <button
      type="button"
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
        notification.isRead ? 'opacity-60' : ''
      }`}
      onClick={handleClick}
      aria-label={`${notification.isRead ? '' : 'Unread: '}${notification.title}`}
    >
      {!notification.isRead && (
        <span
          className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500"
          aria-hidden="true"
        />
      )}
      {notification.isRead && <span className="mt-1.5 h-2 w-2 flex-shrink-0" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getTypeColor(notification.type)}`}
          >
            {getTypeLabel(notification.type)}
          </span>
          <span className="text-xs text-gray-400">{formatTimeAgo(notification.createdAt)}</span>
        </div>
        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
        {notification.body && (
          <p className="mt-0.5 truncate text-xs text-gray-500">{notification.body}</p>
        )}
      </div>
    </button>
  );
}
