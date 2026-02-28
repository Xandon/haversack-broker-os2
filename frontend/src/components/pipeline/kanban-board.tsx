'use client';

import { useState, useCallback } from 'react';


import { CloseReasonModal } from './close-reason-modal';
import { StageColumn } from './stage-column';
import { WeightedForecastBar } from './weighted-forecast-bar';

import type { PipelineResponse, Opportunity } from '@/hooks/use-opportunities';

const STAGE_ORDER = [
  'prospecting',
  'qualified',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
];

interface KanbanBoardProps {
  pipeline: PipelineResponse;
  onStageChange: (opportunityId: string, stage: string, closeReason?: string) => void;
  onOpportunityClick?: (opportunity: Opportunity) => void;
  isUpdating?: boolean;
}

export function KanbanBoard({ pipeline, onStageChange, onOpportunityClick }: KanbanBoardProps) {
  const [pendingDrop, setPendingDrop] = useState<{
    opportunityId: string;
    targetStage: string;
  } | null>(null);

  const handleDrop = useCallback(
    (opportunityId: string, targetStage: string) => {
      if (targetStage === 'closed_won') {
        setPendingDrop({ opportunityId, targetStage });
      } else {
        onStageChange(opportunityId, targetStage);
      }
    },
    [onStageChange],
  );

  const handleCloseReasonConfirm = useCallback(
    (reason: string) => {
      if (pendingDrop) {
        onStageChange(pendingDrop.opportunityId, pendingDrop.targetStage, reason);
        setPendingDrop(null);
      }
    },
    [pendingDrop, onStageChange],
  );

  const handleCloseReasonCancel = useCallback(() => {
    setPendingDrop(null);
  }, []);

  return (
    <div>
      <WeightedForecastBar
        totalWeightedForecast={pipeline.summary.totalWeightedForecast}
        totalOpportunities={pipeline.summary.totalOpportunities}
      />

      <div
        className="mt-4 flex gap-3 overflow-x-auto pb-4"
        role="region"
        aria-label="Pipeline kanban board"
      >
        {STAGE_ORDER.map((stage) => {
          const stageData = pipeline.stages[stage];
          return (
            <StageColumn
              key={stage}
              stage={stage}
              opportunities={stageData?.opportunities ?? []}
              count={stageData?.count ?? 0}
              totalValue={stageData?.totalValue ?? 0}
              weightedValue={stageData?.weightedValue ?? 0}
              onDrop={handleDrop}
              onOpportunityClick={onOpportunityClick}
            />
          );
        })}
      </div>

      <CloseReasonModal
        isOpen={pendingDrop !== null}
        onConfirm={handleCloseReasonConfirm}
        onCancel={handleCloseReasonCancel}
      />
    </div>
  );
}
