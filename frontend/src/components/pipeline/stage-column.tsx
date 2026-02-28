'use client';

import { useCallback, type DragEvent } from 'react';

import { OpportunityCard } from './opportunity-card';

import type { Opportunity } from '@/hooks/use-opportunities';


const STAGE_COLORS: Record<string, string> = {
  prospecting: 'border-l-gray-400',
  qualified: 'border-l-blue-400',
  proposal: 'border-l-indigo-400',
  negotiation: 'border-l-purple-400',
  closed_won: 'border-l-green-500',
  closed_lost: 'border-l-red-400',
};

const STAGE_LABELS: Record<string, string> = {
  prospecting: 'Prospect',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
};

interface StageColumnProps {
  stage: string;
  opportunities: Opportunity[];
  count: number;
  totalValue: number;
  weightedValue: number;
  onDrop: (opportunityId: string, targetStage: string) => void;
  onOpportunityClick?: (opportunity: Opportunity) => void;
}

export function StageColumn({
  stage,
  opportunities,
  count,
  totalValue,
  onDrop,
  onOpportunityClick,
}: StageColumnProps) {
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(totalValue);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const opportunityId = e.dataTransfer.getData('text/plain');
      if (opportunityId) {
        onDrop(opportunityId, stage);
      }
    },
    [onDrop, stage],
  );

  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, opportunityId: string) => {
    e.dataTransfer.setData('text/plain', opportunityId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  return (
    <div
      className={`flex w-72 flex-shrink-0 flex-col rounded-lg border-l-4 bg-gray-50 ${STAGE_COLORS[stage] ?? 'border-l-gray-300'}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      role="list"
      aria-label={`${STAGE_LABELS[stage] ?? stage} stage`}
    >
      <div className="px-3 py-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">{STAGE_LABELS[stage] ?? stage}</h3>
          <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
            {count}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-gray-500">{formattedTotal}</p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2" style={{ maxHeight: '60vh' }}>
        {opportunities.map((opp) => (
          <div key={opp.id} draggable onDragStart={(e) => handleDragStart(e, opp.id)}>
            <OpportunityCard opportunity={opp} onClick={onOpportunityClick} />
          </div>
        ))}

        {opportunities.length === 0 && (
          <p className="py-8 text-center text-xs text-gray-400">No opportunities</p>
        )}
      </div>
    </div>
  );
}
