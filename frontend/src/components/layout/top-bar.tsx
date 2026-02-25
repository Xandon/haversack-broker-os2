'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { NotificationBell } from '@/components/shared/notification-bell';
import { useAuth } from '@/providers/auth-provider';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface TopBarProps {
  onMenuToggle: () => void;
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function TopBar({ onMenuToggle }: TopBarProps): React.JSX.Element {
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const toggleProfile = useCallback((): void => {
    setIsProfileOpen((prev) => !prev);
  }, []);

  const handleLogout = useCallback((): void => {
    setIsProfileOpen(false);
    void logout();
  }, [logout]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

  const userInitials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
    : '??';

  const userFullName = user ? `${user.firstName} ${user.lastName}` : 'Unknown User';

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      {/* Left: mobile menu toggle + search */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onMenuToggle}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden"
          aria-label="Toggle sidebar"
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
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>

        {/* Global search trigger (placeholder) */}
        <button
          type="button"
          className="hidden h-10 w-64 items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-400 hover:bg-gray-100 sm:flex"
          aria-label="Search"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          Search...
        </button>
      </div>

      {/* Right: notifications + profile */}
      <div className="flex items-center gap-2">
        <NotificationBell />

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={toggleProfile}
            className="flex h-11 items-center gap-2 rounded-lg px-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="User menu"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
              {userInitials}
            </span>
            <span className="hidden md:inline">{userFullName}</span>
            <svg
              className="hidden h-4 w-4 text-gray-400 md:block"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {isProfileOpen ? (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-medium text-gray-900">{userFullName}</p>
                <p className="text-xs text-gray-500">{user?.email ?? ''}</p>
                <p className="mt-0.5 text-xs capitalize text-gray-400">{user?.role ?? ''}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full min-h-[44px] items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
