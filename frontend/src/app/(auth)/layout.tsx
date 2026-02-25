'use client';

import type { ReactNode } from 'react';

import { AuthProvider } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';

export default function AuthLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <QueryProvider>
      <AuthProvider>
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </AuthProvider>
    </QueryProvider>
  );
}
