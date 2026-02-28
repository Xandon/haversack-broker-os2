'use client';

import type { UpdateOpportunityStageInput } from '@haversack/shared';

import { KanbanBoard } from '@/components/pipeline/kanban-board';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { Skeleton } from '@/components/shared/skeleton';
import { usePipeline, useUpdateOpportunityStage } from '@/hooks/use-opportunities';

export default function PipelinePage() {
  const { data: pipeline, isLoading, error, refetch } = usePipeline();
  const updateStage = useUpdateOpportunityStage('');

  if (error) {
    return <ErrorBanner message="Unable to load pipeline" onRetry={() => refetch()} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
        <div className="flex gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="w-64 shrink-0">
              <Skeleton className="mb-2 h-6 w-32" />
              <Skeleton className="h-48 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!pipeline || pipeline.summary.totalOpportunities === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
        <EmptyState
          title="No opportunities in pipeline"
          description="Create an opportunity to get started"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
      <KanbanBoard
        pipeline={pipeline}
        onStageChange={(opportunityId, stage, closeReason) => {
          updateStage.mutate({ stage: stage as UpdateOpportunityStageInput['stage'], closeReason });
        }}
      />
    </div>
  );
}
