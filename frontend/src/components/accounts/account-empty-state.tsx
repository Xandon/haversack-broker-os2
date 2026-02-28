import Link from 'next/link';
import { EmptyState } from '@/components/patterns/empty-state';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

interface AccountEmptyStateProps {
  isFiltered: boolean;
  onClearFilters?: () => void;
}

export function AccountEmptyState({ isFiltered, onClearFilters }: AccountEmptyStateProps): React.ReactElement {
  if (isFiltered) {
    return (
      <EmptyState
        icon={Users}
        title="No accounts match your filters"
        description="Try adjusting your filters or search criteria"
        action={
          onClearFilters ? (
            <Button variant="outline" onClick={onClearFilters}>
              Clear Filters
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <EmptyState
      icon={Users}
      title="No accounts found"
      description="Get started by creating your first account"
      action={
        <Button asChild>
          <Link href="/accounts/new">Create Account</Link>
        </Button>
      }
    />
  );
}
