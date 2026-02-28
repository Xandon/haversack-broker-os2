'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ProductResponse } from '@haversack/shared';

export type ViewMode = 'grid' | 'list';

export interface ProductCardProps {
  product: ProductResponse;
  viewMode: ViewMode;
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

export function ProductCard({ product, viewMode }: ProductCardProps): React.ReactElement {
  if (viewMode === 'list') {
    return (
      <Link href={`/products/${product.id}`} className="block">
        <Card className="transition-colors hover:bg-muted/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
              IMG
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{product.name}</p>
              <p className="text-sm text-muted-foreground">{product.brand.name} &middot; {product.sku}</p>
            </div>
            <div className="flex items-center gap-3">
              {product.certifications.length > 0 && (
                <div className="hidden gap-1 sm:flex">
                  {product.certifications.slice(0, 3).map((cert) => (
                    <Badge key={cert} variant="outline" className="text-xs">
                      {cert.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              )}
              <Badge variant={getAvailabilityVariant(product.availabilityStatus)}>
                {product.availabilityStatus}
              </Badge>
              <span className="w-20 text-right font-medium">
                {formatPrice(product.unitPrice)}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/products/${product.id}`} className="block">
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="p-4">
          <div className="mb-3 flex h-32 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
            IMG
          </div>
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium leading-tight">{product.name}</p>
              <Badge variant={getAvailabilityVariant(product.availabilityStatus)} className="shrink-0">
                {product.availabilityStatus}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{product.brand.name}</p>
            <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
            <p className="text-lg font-semibold">{formatPrice(product.unitPrice)}</p>
            {product.certifications.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {product.certifications.map((cert) => (
                  <Badge key={cert} variant="outline" className="text-xs">
                    {cert.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
