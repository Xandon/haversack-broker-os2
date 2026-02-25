'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

import {
  useNotificationsList,
  useMarkAsRead,
  type Notification,
} from '@/hooks/use-notifications';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  markAsRead: (id: string) => void;
  isMarkingAsRead: boolean;
}

// -------------------------------------------------------------------
// Context
// -------------------------------------------------------------------

const NotificationContext = createContext<NotificationContextValue | null>(null);

// -------------------------------------------------------------------
// Hook
// -------------------------------------------------------------------

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// -------------------------------------------------------------------
// Provider
// -------------------------------------------------------------------

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({
  children,
}: NotificationProviderProps): React.JSX.Element {
  const {
    notifications,
    unreadCount,
    total,
    isLoading,
    isError,
    error,
  } = useNotificationsList();

  const {
    markAsRead: markAsReadMutation,
    isPending: isMarkingAsRead,
  } = useMarkAsRead();

  const markAsRead = useCallback(
    (id: string): void => {
      markAsReadMutation(id);
    },
    [markAsReadMutation],
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      total,
      isLoading,
      isError,
      error,
      markAsRead,
      isMarkingAsRead,
    }),
    [
      notifications,
      unreadCount,
      total,
      isLoading,
      isError,
      error,
      markAsRead,
      isMarkingAsRead,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
