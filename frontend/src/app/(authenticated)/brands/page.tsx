'use client';

import * as React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/patterns/page-header';
import { EmptyState } from '@/components/patterns/empty-state';
import { ErrorState } from '@/components/patterns/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBrands } from '@/hooks/use-brands';

function BrandListSkeleton(): React.ReactElement {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-5 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function BrandListPage(): React.ReactElement {
  const { data, isLoading, isError, refetch } = useBrands({ isActive: true });

  const brands = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brands"
        description="Browse brands and their product catalogs"
      />

      {isLoading && <BrandListSkeleton />}

      {isError && (
        <ErrorState
          title="Failed to load brands"
          message="There was an error loading the brand list. Please try again."
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !isError && brands.length === 0 && (
        <EmptyState
          title="No brands found"
          message="No active brands available."
        />
      )}

      {!isLoading && !isError && brands.length > 0 && (
        <div className="space-y-2">
          {brands.map((brand) => (
            <Link key={brand.id} href={`/brands/${brand.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {brand.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{brand.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {brand.activeProductCount} active products
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {brand.commissionRate}% commission
                    </span>
                    <Badge variant={brand.isActive ? 'default' : 'secondary'}>
                      {brand.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
