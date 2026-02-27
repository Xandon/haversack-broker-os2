'use client';

import { useOnlineStatus } from '@/hooks/use-online-status';
import { WifiOff } from 'lucide-react';

export function OfflineBanner(): React.ReactElement | null {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 bg-yellow-100 px-4 py-2 text-sm text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-200"
    >
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      <span>You are offline — some features may be unavailable</span>
    </div>
  );
}
