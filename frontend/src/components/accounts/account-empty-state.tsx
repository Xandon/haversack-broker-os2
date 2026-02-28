import { EmptyState } from '@/components/patterns/empty-state';
import { Users } from 'lucide-react';

interface AccountEmptyStateProps {
  isFiltered: boolean;
  onClearFilters?: () => void;
}

export function AccountEmptyState({ isFiltered, onClearFilters }: AccountEmptyStateProps): React.ReactElement {
  if (isFiltered) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="No accounts match your filters"
        description="Try adjusting your filters or search criteria"
        actionLabel="Clear Filters"
        onAction={onClearFilters}
      />
    );
  }

  return (
    <EmptyState
      icon={<Users className="h-12 w-12" />}
      title="No accounts found"
      description="Get started by creating your first account"
      actionLabel="Create Account"
      onAction={() => {
        window.location.href = '/accounts/new';
      }}
    />
  );
}
