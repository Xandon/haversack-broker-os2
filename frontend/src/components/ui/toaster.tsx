'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster(): React.ReactElement {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        classNames: {
          toast: 'bg-background text-foreground border-border',
          error: 'bg-destructive text-destructive-foreground',
          success: 'bg-success text-success-foreground',
          warning: 'bg-warning text-warning-foreground',
          info: 'bg-info text-info-foreground',
        },
      }}
      richColors
      closeButton
    />
  );
}
