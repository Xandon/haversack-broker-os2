'use client';

import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { AuthProvider, ProtectedRoute } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <QueryProvider>
      <AuthProvider>
        <ProtectedRoute>
          <AppShell>{children}</AppShell>
        </ProtectedRoute>
      </AuthProvider>
    </QueryProvider>
  );
}
