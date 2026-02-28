'use client';

import * as React from 'react';
import { DndContext, DragOverlay, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { PageHeader } from '@/components/patterns/page-header';
import { ErrorState } from '@/components/patterns/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PipelineSummary } from '@/components/pipeline/pipeline-summary';
import { KanbanColumn } from '@/components/pipeline/kanban-column';
import { OpportunityCard } from '@/components/pipeline/opportunity-card';
import { CloseDialog } from '@/components/pipeline/close-dialog';
import { usePipelineSummary, useTransitionOpportunity } from '@/hooks/use-opportunities';
import { toast } from 'sonner';
import { LayoutGrid, List } from 'lucide-react';
import type { OpportunityResponse } from '@haversack/shared';

type ViewMode = 'kanban' | 'list';

const STAGE_CONFIG: { stage: string; label: string }[] = [
  { stage: 'prospect', label: 'Prospect' },
  { stage: 'qualified', label: 'Qualified' },
  { stage: 'proposal', label: 'Proposal' },
  { stage: 'negotiation', label: 'Negotiation' },
  { stage: 'closed_won', label: 'Closed Won' },
  { stage: 'closed_lost', label: 'Closed Lost' },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function KanbanSkeleton(): React.ReactElement {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="min-w-[280px] rounded-lg border bg-muted/30 p-3">
          <Skeleton className="mb-3 h-5 w-24" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <Card key={j}>
                <CardContent className="p-3">
                  <Skeleton className="mb-2 h-4 w-3/4" />
                  <Skeleton className="mb-2 h-3 w-1/2" />
                  <Skeleton className="h-5 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OpportunitiesPage(): React.ReactElement {
  const [viewMode, setViewMode] = React.useState<ViewMode>('kanban');
  const [activeDragOpp, setActiveDragOpp] = React.useState<OpportunityResponse | null>(null);
  const [closeDialog, setCloseDialog] = React.useState<{
    open: boolean;
    stage: 'closed_won' | 'closed_lost';
    opportunityId: string;
    opportunityName: string;
  }>({ open: false, stage: 'closed_won', opportunityId: '', opportunityName: '' });

  const { data, isLoading, isError, refetch } = usePipelineSummary();
  const transition = useTransitionOpportunity();

  const stages = data?.data.stages ?? {};
  const forecast = data?.data.forecast ?? { weightedTotal: 0, totalOpenValue: 0, opportunityCount: 0 };

  function handleDragStart(event: DragStartEvent): void {
    const oppId = String(event.active.id);
    for (const stageData of Object.values(stages)) {
      const found = stageData.opportunities.find((o) => o.id === oppId);
      if (found) {
        setActiveDragOpp(found);
        break;
      }
    }
  }

  function handleDragEnd(event: DragEndEvent): void {
    setActiveDragOpp(null);
    const { active, over } = event;
    if (!over) return;

    const opportunityId = String(active.id);
    const newStage = String(over.id);

    // Find the opportunity to check its current stage
    let currentOpp: OpportunityResponse | undefined;
    for (const stageData of Object.values(stages)) {
      currentOpp = stageData.opportunities.find((o) => o.id === opportunityId);
      if (currentOpp) break;
    }
    if (!currentOpp || currentOpp.stage === newStage) return;

    // If dropping to a close stage, show the dialog
    if (newStage === 'closed_won' || newStage === 'closed_lost') {
      setCloseDialog({
        open: true,
        stage: newStage,
        opportunityId,
        opportunityName: currentOpp.name,
      });
      return;
    }

    transition.mutate(
      { opportunityId, stage: newStage as 'prospect' | 'qualified' | 'proposal' | 'negotiation' },
      {
        onSuccess: () => {
          toast.success(`Moved to ${newStage}`);
        },
        onError: () => {
          toast.error('Failed to update stage');
        },
      },
    );
  }

  function handleCloseConfirm(reason: string): void {
    transition.mutate(
      {
        opportunityId: closeDialog.opportunityId,
        stage: closeDialog.stage,
        closeReason: reason,
      },
      {
        onSuccess: () => {
          toast.success(`Marked as ${closeDialog.stage === 'closed_won' ? 'Won' : 'Lost'}`);
          setCloseDialog((prev) => ({ ...prev, open: false }));
        },
        onError: () => {
          toast.error('Failed to update stage');
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        description="Track and manage sales opportunities"
        actions={
          <div className="flex items-center gap-1 rounded-md border p-1">
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              aria-label="Kanban view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <PipelineSummary
        weightedTotal={forecast.weightedTotal}
        totalOpenValue={forecast.totalOpenValue}
        opportunityCount={forecast.opportunityCount}
        isLoading={isLoading}
      />

      {isError && (
        <ErrorState
          title="Failed to load pipeline"
          message="There was an error loading the pipeline data. Please try again."
          onRetry={() => void refetch()}
        />
      )}

      {isLoading && <KanbanSkeleton />}

      {!isLoading && !isError && viewMode === 'kanban' && (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGE_CONFIG.map(({ stage, label }) => {
              const stageData = stages[stage];
              return (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  label={label}
                  opportunities={stageData?.opportunities ?? []}
                  count={stageData?.count ?? 0}
                  totalValue={stageData?.totalValue ?? 0}
                />
              );
            })}
          </div>
          <DragOverlay>
            {activeDragOpp ? <OpportunityCard opportunity={activeDragOpp} isDragOverlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {!isLoading && !isError && viewMode === 'list' && (
        <div className="space-y-4">
          {STAGE_CONFIG.map(({ stage, label }) => {
            const stageData = stages[stage];
            const opps = stageData?.opportunities ?? [];
            if (opps.length === 0) return null;
            return (
              <div key={stage}>
                <h3 className="mb-2 text-sm font-semibold">{label} ({opps.length})</h3>
                <div className="space-y-1">
                  {opps.map((opp) => (
                    <div key={opp.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">{opp.name}</p>
                        <p className="text-xs text-muted-foreground">{opp.accountName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(opp.estimatedValue)}</p>
                        <p className="text-xs text-muted-foreground">{opp.probability}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CloseDialog
        open={closeDialog.open}
        onOpenChange={(open) => setCloseDialog((prev) => ({ ...prev, open }))}
        stage={closeDialog.stage}
        opportunityName={closeDialog.opportunityName}
        onConfirm={handleCloseConfirm}
        isLoading={transition.isPending}
      />
    </div>
  );
}
