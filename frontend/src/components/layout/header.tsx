'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { NotificationBell } from '@/components/notifications/notification-bell';

interface HeaderProps {
  userName?: string;
  onLogout?: () => void;
}

export function Header({ userName = 'User', onLogout }: HeaderProps) {
  const router = useRouter();

  const handleLogout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
    onLogout?.();
    router.push('/login');
  }, [onLogout, router]);

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-medium text-gray-500">Haversack Unified Platform</h1>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell unreadCount={0} onClick={() => {}} />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{userName}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
