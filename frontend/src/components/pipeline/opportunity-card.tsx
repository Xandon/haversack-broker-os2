'use client';

import type { Opportunity } from '@/hooks/use-opportunities';

interface OpportunityCardProps {
  opportunity: Opportunity;
  onClick?: (opportunity: Opportunity) => void;
  isDragging?: boolean;
}

export function OpportunityCard({ opportunity, onClick, isDragging }: OpportunityCardProps) {
  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(opportunity.estimatedValue);

  const closeDate = new Date(opportunity.closeDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className={`rounded-lg border bg-white p-3 shadow-sm transition-shadow cursor-grab ${
        isDragging ? 'shadow-lg ring-2 ring-blue-400 opacity-90' : 'hover:shadow-md'
      }`}
      onClick={() => onClick?.(opportunity)}
      draggable
      role="listitem"
      aria-label={`Opportunity: ${opportunity.name}, ${formattedValue}`}
    >
      <h4 className="truncate text-sm font-medium text-gray-900">{opportunity.name}</h4>

      {opportunity.account && (
        <p className="mt-0.5 truncate text-xs text-indigo-600">{opportunity.account.name}</p>
      )}

      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">{formattedValue}</span>
        <span className="text-xs text-gray-500">{closeDate}</span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-gray-100">
          <div
            className="h-1.5 rounded-full bg-blue-500"
            style={{ width: `${opportunity.probability}%` }}
          />
        </div>
        <span className="text-xs text-gray-500">{opportunity.probability}%</span>
      </div>

      {opportunity.assignedRep && (
        <p className="mt-1.5 truncate text-xs text-gray-400">
          {opportunity.assignedRep.firstName} {opportunity.assignedRep.lastName}
        </p>
      )}
    </div>
  );
}
