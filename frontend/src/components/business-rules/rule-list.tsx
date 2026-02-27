'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { BusinessRule } from '@/hooks/use-business-rules';

interface RuleListProps {
  rules: BusinessRule[] | undefined;
  isLoading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, newStatus: 'active' | 'inactive') => void;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  error: 'bg-red-100 text-red-800',
};

export function RuleList({
  rules,
  isLoading,
  onEdit,
  onDelete,
  onToggleStatus,
}: RuleListProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!rules || rules.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">No business rules configured yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first rule to automate actions based on conditions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <Card key={rule.id}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">{rule.name}</CardTitle>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  STATUS_STYLES[rule.status] ?? STATUS_STYLES['inactive'],
                )}
              >
                {rule.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] min-w-[44px]"
                onClick={() =>
                  onToggleStatus(
                    rule.id,
                    rule.status === 'active' ? 'inactive' : 'active',
                  )
                }
                aria-label={`${rule.status === 'active' ? 'Deactivate' : 'Activate'} rule ${rule.name}`}
              >
                {rule.status === 'active' ? 'Deactivate' : 'Activate'}
              </Button>
              <Button variant="outline" size="sm" className="min-h-[44px] min-w-[44px]" onClick={() => onEdit(rule.id)} aria-label={`Edit rule ${rule.name}`}>
                Edit
              </Button>
              <Button variant="outline" size="sm" className="min-h-[44px] min-w-[44px]" onClick={() => onDelete(rule.id)} aria-label={`Delete rule ${rule.name}`}>
                Delete
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>Entity: {rule.entityType}</span>
              <span>Priority: {rule.priority}</span>
              <span>
                Actions: {rule.actions.map((a) => a.type.replace(/_/g, ' ')).join(', ')}
              </span>
              {rule.lastFiredAt && (
                <span>Last fired: {new Date(rule.lastFiredAt).toLocaleDateString()}</span>
              )}
              {rule.errorMessage && (
                <span className="text-red-600">Error: {rule.errorMessage}</span>
              )}
            </div>
            {rule.description && (
              <p className="mt-2 text-sm text-muted-foreground">{rule.description}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
