'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/patterns/page-header';
import { ErrorState } from '@/components/patterns/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProduct } from '@/hooks/use-products';

function ProductDetailSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}

function getAvailabilityVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default';
    case 'seasonal':
      return 'secondary';
    case 'discontinued':
      return 'destructive';
    default:
      return 'outline';
  }
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export default function ProductDetailPage(): React.ReactElement {
  const params = useParams();
  const productId = params['id'] as string;
  const { data, isLoading, isError, refetch } = useProduct(productId);

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <ErrorState
          title="Failed to load product"
          message="There was an error loading the product details. Please try again."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const product = data.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        breadcrumbs={[
          { label: 'Products', href: '/products' },
          { label: product.name },
        ]}
      />

      <div className="flex items-center gap-3">
        <Badge variant={getAvailabilityVariant(product.availabilityStatus)}>
          {product.availabilityStatus}
        </Badge>
        <span className="text-sm text-muted-foreground">SKU: {product.sku}</span>
        <Link href={`/brands/${product.brand.id}`} className="text-sm text-primary hover:underline">
          {product.brand.name}
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unit Price</span>
              <span className="font-semibold">{formatPrice(product.unitPrice)}</span>
            </div>
            {product.wholesalePrice && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Wholesale Price</span>
                <span className="font-semibold">{formatPrice(product.wholesalePrice)}</span>
              </div>
            )}
            {product.promotionalPrice && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Promotional Price</span>
                <span className="font-semibold text-green-600">{formatPrice(product.promotionalPrice)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Revenue Model</span>
              <span className="capitalize">{product.revenueModelDefault}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Commission Rate</span>
              <span>{product.commissionRate}%</span>
            </div>
            {product.caseSize && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Case Size</span>
                <span>{product.caseSize} units</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.category && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="capitalize">{product.category}</span>
              </div>
            )}
            {product.description && (
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Description</p>
                <p className="text-sm">{product.description}</p>
              </div>
            )}
            {product.certifications.length > 0 && (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Certifications</p>
                <div className="flex flex-wrap gap-1">
                  {product.certifications.map((cert) => (
                    <Badge key={cert} variant="outline">
                      {cert.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {product.allergens.length > 0 && (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Allergens</p>
                <div className="flex flex-wrap gap-1">
                  {product.allergens.map((allergen) => (
                    <Badge key={allergen} variant="destructive">
                      {allergen.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {product.dietaryAttributes.length > 0 && (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Dietary</p>
                <div className="flex flex-wrap gap-1">
                  {product.dietaryAttributes.map((attr) => (
                    <Badge key={attr} variant="secondary">
                      {attr.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
