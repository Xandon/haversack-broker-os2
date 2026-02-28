'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/patterns/page-header';
import { ErrorState } from '@/components/patterns/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBrand } from '@/hooks/use-brands';
import { useProducts } from '@/hooks/use-products';
import { useGenerateLineCard } from '@/hooks/use-line-card';
import { ProductCard } from '@/components/products/product-card';

function BrandDetailSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="col-span-2 h-48 rounded-lg" />
      </div>
    </div>
  );
}

export default function BrandDetailPage(): React.ReactElement {
  const params = useParams();
  const brandId = params['id'] as string;
  const { data: brandData, isLoading: brandLoading, isError: brandError, refetch } = useBrand(brandId);
  const { data: productsData, isLoading: productsLoading } = useProducts({ brandId });
  const generateLineCard = useGenerateLineCard();

  const handleDownloadLineCard = (): void => {
    generateLineCard.mutate(brandId, {
      onSuccess: ({ blob, filename }) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Line card downloaded');
      },
      onError: () => {
        toast.error('Failed to generate line card');
      },
    });
  };

  if (brandLoading) {
    return <BrandDetailSkeleton />;
  }

  if (brandError || !brandData) {
    return (
      <div className="p-6">
        <ErrorState
          title="Failed to load brand"
          message="There was an error loading the brand details. Please try again."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const brand = brandData.data;
  const products = productsData?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={brand.name}
        breadcrumbs={[
          { label: 'Brands', href: '/brands' },
          { label: brand.name },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadLineCard}
              disabled={generateLineCard.isPending}
            >
              {generateLineCard.isPending ? 'Generating...' : 'Download Line Card'}
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3">
        <Badge variant={brand.isActive ? 'default' : 'secondary'}>
          {brand.isActive ? 'Active' : 'Inactive'}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {brand.commissionRate}% commission rate
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Brand Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {brand.description && (
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Description</p>
                <p className="text-sm">{brand.description}</p>
              </div>
            )}
            {brand.contactName && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Contact</span>
                <span className="text-sm">{brand.contactName}</span>
              </div>
            )}
            {brand.contactEmail && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <a href={`mailto:${brand.contactEmail}`} className="text-sm text-primary hover:underline">
                  {brand.contactEmail}
                </a>
              </div>
            )}
            {brand.contactPhone && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Phone</span>
                <span className="text-sm">{brand.contactPhone}</span>
              </div>
            )}
            {brand.website && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Website</span>
                <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                  Visit
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Products ({products.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {productsLoading && (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              )}
              {!productsLoading && products.length === 0 && (
                <p className="text-sm text-muted-foreground">No products for this brand.</p>
              )}
              {!productsLoading && products.length > 0 && (
                <div className="space-y-2">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} viewMode="list" />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
