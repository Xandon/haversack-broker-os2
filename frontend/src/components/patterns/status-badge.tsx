import * as React from 'react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

export interface StatusBadgeProps {
  status: string;
  variantMap?: Record<string, BadgeVariant>;
  className?: string;
}

const DEFAULT_VARIANT_MAP: Record<string, BadgeVariant> = {
  active: 'success',
  approved: 'success',
  completed: 'success',
  confirmed: 'success',
  pending: 'warning',
  in_progress: 'warning',
  draft: 'secondary',
  inactive: 'secondary',
  rejected: 'destructive',
  cancelled: 'destructive',
  overdue: 'destructive',
};

function StatusBadge({ status, variantMap, className }: StatusBadgeProps): React.ReactElement {
  const map = variantMap ?? DEFAULT_VARIANT_MAP;
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  const variant = map[normalizedStatus] ?? 'outline';
  const displayLabel = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Badge variant={variant} className={cn(className)}>
      {displayLabel}
    </Badge>
  );
}

export { StatusBadge };
