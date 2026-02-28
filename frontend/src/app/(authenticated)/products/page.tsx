'use client';

import * as React from 'react';
import { PageHeader } from '@/components/patterns/page-header';
import { EmptyState } from '@/components/patterns/empty-state';
import { ErrorState } from '@/components/patterns/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { ProductCard } from '@/components/products/product-card';
import { ProductFilters } from '@/components/products/product-filters';
import { useProducts } from '@/hooks/use-products';
import type { ViewMode } from '@/components/products/product-card';
import type { ProductFilterValues } from '@/components/products/product-filters';

function ProductGridSkeleton(): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="mb-3 h-32 w-full rounded-md" />
            <Skeleton className="mb-2 h-5 w-3/4" />
            <Skeleton className="mb-2 h-4 w-1/2" />
            <Skeleton className="h-6 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ProductCatalogPage(): React.ReactElement {
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
  const [filters, setFilters] = React.useState<ProductFilterValues>({
    brandId: '',
    category: '',
    certification: '',
    availabilityStatus: '',
  });

  const queryParams = {
    ...(filters.brandId && { brandId: filters.brandId }),
    ...(filters.category && { category: filters.category }),
    ...(filters.certification && { certification: filters.certification }),
    ...(filters.availabilityStatus && { availabilityStatus: filters.availabilityStatus }),
  };

  const { data, isLoading, isError, refetch } = useProducts(queryParams);

  const products = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Browse the product catalog"
      />

      <ProductFilters
        filters={filters}
        onFilterChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {isLoading && <ProductGridSkeleton />}

      {isError && (
        <ErrorState
          title="Failed to load products"
          message="There was an error loading the product catalog. Please try again."
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !isError && products.length === 0 && (
        <EmptyState
          title="No products found"
          message="Try adjusting your filters or check back later."
        />
      )}

      {!isLoading && !isError && products.length > 0 && (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
              : 'space-y-2'
          }
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} viewMode={viewMode} />
          ))}
        </div>
      )}

      {data?.pagination.hasMore && (
        <div className="flex justify-center">
          <button
            className="text-sm text-muted-foreground underline hover:text-foreground"
            onClick={() => {
              // Cursor pagination would be handled by updating query params
            }}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
