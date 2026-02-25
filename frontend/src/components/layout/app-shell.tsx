'use client';

import { useCallback, useState, type ReactNode } from 'react';

import { MobileNav } from '@/components/layout/mobile-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface AppShellProps {
  children: ReactNode;
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function AppShell({ children }: AppShellProps): React.JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback((): void => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback((): void => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuToggle={toggleSidebar} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />
    </div>
  );
}
