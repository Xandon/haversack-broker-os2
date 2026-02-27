'use client';

import type { ReactNode } from 'react';
import { MonitoringProvider } from './monitoring-provider';
import { QueryProvider } from './query-provider';
import { AuthProvider } from './auth-provider';

export function Providers({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <MonitoringProvider>
      <QueryProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryProvider>
    </MonitoringProvider>
  );
}
