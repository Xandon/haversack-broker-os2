'use client';

import { useState, useCallback, type ReactNode } from 'react';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { OfflineBanner } from '@/components/layout/offline-banner';
import { MobileNav } from '@/components/layout/mobile-nav';

export default function AuthenticatedLayout({ children }: { children: ReactNode }): React.ReactElement {
  const [isNavOpen, setIsNavOpen] = useState(false);

  const handleToggleNav = useCallback((): void => {
    setIsNavOpen((prev) => !prev);
  }, []);

  const handleCloseNav = useCallback((): void => {
    setIsNavOpen(false);
  }, []);

  return (
    <ProtectedRoute>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar onToggleNav={handleToggleNav} />
          <OfflineBanner />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
        <MobileNav isOpen={isNavOpen} onClose={handleCloseNav} />
      </div>
    </ProtectedRoute>
  );
}
