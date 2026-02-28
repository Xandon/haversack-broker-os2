'use client';

import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { OpportunityCard } from './opportunity-card';
import type { OpportunityResponse } from '@haversack/shared';

export interface KanbanColumnProps {
  stage: string;
  label: string;
  opportunities: OpportunityResponse[];
  count: number;
  totalValue: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export function KanbanColumn({ stage, label, opportunities, count, totalValue }: KanbanColumnProps): React.ReactElement {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[280px] flex-col rounded-lg border bg-muted/30 ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="border-b p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{label}</h3>
          <Badge variant="secondary" className="text-xs">{count}</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{formatCurrency(totalValue)}</p>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: '60vh' }}>
        {opportunities.map((opp) => (
          <OpportunityCard key={opp.id} opportunity={opp} />
        ))}
        {opportunities.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">No opportunities</p>
        )}
      </div>
    </div>
  );
}
