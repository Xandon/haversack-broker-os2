import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  requestId?: string;
  className?: string;
}

function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  requestId,
  className,
}: ErrorStateProps): React.ReactElement {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
      <h3 className="text-h4 text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-body text-muted-foreground">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-6 min-h-[44px] min-w-[44px]">
          Try again
        </Button>
      )}
      {requestId && <p className="mt-4 text-small text-muted-foreground">Reference: {requestId}</p>}
    </div>
  );
}

export { ErrorState };
