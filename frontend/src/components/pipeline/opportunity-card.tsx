'use client';

import * as React from 'react';
import Link from 'next/link';
import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { OpportunityResponse } from '@haversack/shared';

export interface OpportunityCardProps {
  opportunity: OpportunityResponse;
  isDragOverlay?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function OpportunityCard({ opportunity, isDragOverlay = false }: OpportunityCardProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: opportunity.id,
    disabled: isDragOverlay,
  });

  const card = (
    <Card
      ref={setNodeRef}
      className={`cursor-grab transition-colors hover:bg-muted/50 active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
      {...listeners}
      {...attributes}
    >
      <CardContent className="p-3">
        <p className="mb-1 truncate text-sm font-medium">{opportunity.name}</p>
        <p className="mb-2 text-xs text-muted-foreground">{opportunity.accountName}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{formatCurrency(opportunity.estimatedValue)}</span>
          <Badge variant="outline" className="text-xs">
            {opportunity.probability}%
          </Badge>
        </div>
        {opportunity.brands.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {opportunity.brands.slice(0, 2).map((brand) => (
              <Badge key={brand.id} variant="secondary" className="text-xs">
                {brand.name}
              </Badge>
            ))}
            {opportunity.brands.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{opportunity.brands.length - 2}
              </Badge>
            )}
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Close: {formatDate(opportunity.expectedCloseDate)}
        </p>
      </CardContent>
    </Card>
  );

  if (isDragOverlay) {
    return card;
  }

  return (
    <Link href={`/opportunities/${opportunity.id}`} className="block">
      {card}
    </Link>
  );
}
