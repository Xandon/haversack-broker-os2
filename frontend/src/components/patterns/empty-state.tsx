import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

function EmptyState({ title, description, icon, actionLabel, onAction, className }: EmptyStateProps): React.ReactElement {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-h4 text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-body text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-6 min-h-[44px] min-w-[44px]">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export { EmptyState };
