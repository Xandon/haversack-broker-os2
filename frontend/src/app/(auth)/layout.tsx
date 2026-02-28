import type { ReactNode } from 'react';

import { QueryProvider } from '@/providers/query-provider';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <div className="flex min-h-screen items-center justify-center bg-gray-50">{children}</div>
    </QueryProvider>
  );
}
