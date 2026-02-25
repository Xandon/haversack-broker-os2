'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// -------------------------------------------------------------------
// Placeholder data
// -------------------------------------------------------------------

const PLACEHOLDER_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'New order placed',
    message: 'Order #1042 was placed by Portland Provisions.',
    read: false,
    createdAt: '2026-02-25T10:30:00Z',
  },
  {
    id: '2',
    title: 'Commission approved',
    message: 'January commissions have been approved by your manager.',
    read: false,
    createdAt: '2026-02-24T16:00:00Z',
  },
  {
    id: '3',
    title: 'Account health alert',
    message: 'Cascade Cheese Co. health score dropped below 50.',
    read: true,
    createdAt: '2026-02-23T09:15:00Z',
  },
];

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function NotificationBell(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications] = useState<Notification[]>(PLACEHOLDER_NOTIFICATIONS);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const togglePanel = useCallback((): void => {
    setIsOpen((prev) => !prev);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={togglePanel}
        className="relative flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">No notifications</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`px-4 py-3 ${notification.read ? 'bg-white' : 'bg-blue-50'}`}
                  >
                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                    <p className="mt-0.5 text-sm text-gray-500">{notification.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-gray-200 px-4 py-2">
            <button
              type="button"
              className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all notifications
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
