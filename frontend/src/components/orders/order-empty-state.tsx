import { EmptyState } from '@/components/patterns/empty-state';
import { ShoppingCart } from 'lucide-react';

interface OrderEmptyStateProps {
  isFiltered: boolean;
  onClearFilters?: () => void;
}

export function OrderEmptyState({ isFiltered, onClearFilters }: OrderEmptyStateProps): React.ReactElement {
  if (isFiltered) {
    return (
      <EmptyState
        icon={<ShoppingCart className="h-12 w-12" />}
        title="No orders match your filters"
        description="Try adjusting your filters to see more results"
        actionLabel="Clear Filters"
        onAction={onClearFilters}
      />
    );
  }

  return (
    <EmptyState
      icon={<ShoppingCart className="h-12 w-12" />}
      title="No orders yet"
      description="Create your first order to get started"
      actionLabel="Create Order"
      onAction={() => {
        window.location.href = '/orders/new';
      }}
    />
  );
}
