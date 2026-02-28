'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from '@/hooks/use-notifications';
import type { NotificationItem } from '@/hooks/use-notifications';
import { Bell, CheckCheck } from 'lucide-react';

function getNotificationUrl(notification: NotificationItem): string | null {
  if (!notification.referenceId || !notification.referenceType) return null;
  switch (notification.referenceType) {
    case 'task':
      return '/tasks';
    case 'order':
      return `/orders/${notification.referenceId}`;
    case 'account':
      return `/accounts/${notification.referenceId}`;
    case 'opportunity':
      return `/opportunities/${notification.referenceId}`;
    default:
      return null;
  }
}

function groupByDate(notifications: NotificationItem[]): Record<string, NotificationItem[]> {
  const groups: Record<string, NotificationItem[]> = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  for (const n of notifications) {
    const date = new Date(n.createdAt);
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    let label: string;
    if (dateOnly.getTime() === today.getTime()) {
      label = 'Today';
    } else if (dateOnly.getTime() === yesterday.getTime()) {
      label = 'Yesterday';
    } else {
      label = 'Earlier';
    }

    if (!groups[label]) {
      groups[label] = [];
    }
    (groups[label] as NotificationItem[]).push(n);
  }

  return groups;
}

function NotificationItemRow({
  notification,
  onRead,
  onNavigate,
}: {
  notification: NotificationItem;
  onRead: (id: string) => void;
  onNavigate: (url: string) => void;
}): React.ReactElement {
  const url = getNotificationUrl(notification);

  function handleClick(): void {
    if (!notification.isRead) {
      onRead(notification.id);
    }
    if (url) {
      onNavigate(url);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full p-3 text-left transition-colors hover:bg-muted ${
        notification.isRead ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className={`text-sm ${notification.isRead ? '' : 'font-medium'}`}>
            {notification.title}
          </p>
          {notification.body && (
            <p className="mt-0.5 text-xs text-muted-foreground">{notification.body}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(notification.createdAt).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
        {!notification.isRead && (
          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
        )}
      </div>
    </button>
  );
}

export function NotificationBell(): React.ReactElement {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.data ?? [];
  const grouped = groupByDate(notifications);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleRead(id: string): void {
    markRead.mutate(id);
  }

  function handleNavigate(url: string): void {
    setIsOpen(false);
    router.push(url);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className="relative min-h-[44px] min-w-[44px]"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive p-0 text-xs text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b p-3">
            <h3 className="text-sm font-medium">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllRead.mutate()}
                className="text-xs"
              >
                <CheckCheck className="mr-1 h-3 w-3" />
                Mark all read
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              Object.entries(grouped).map(([label, items]) => (
                <div key={label}>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    {label}
                  </div>
                  {items.map((n) => (
                    <NotificationItemRow
                      key={n.id}
                      notification={n}
                      onRead={handleRead}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
