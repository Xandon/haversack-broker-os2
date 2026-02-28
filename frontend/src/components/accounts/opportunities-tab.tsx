'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/patterns/error-state';
import { EmptyState } from '@/components/patterns/empty-state';
import { StatusBadge } from '@/components/patterns/status-badge';
import { useAccountOpportunities, type OpportunityItem } from '@/hooks/use-account-opportunities';

interface OpportunitiesTabProps {
  accountId: string;
}

const STAGE_VARIANT_MAP: Record<string, 'success' | 'warning' | 'secondary' | 'destructive' | 'outline'> = {
  prospect: 'secondary',
  qualified: 'outline',
  proposal: 'warning',
  negotiation: 'warning',
  closed_won: 'success',
  closed_lost: 'destructive',
};

function OpportunityCard({ opportunity }: { opportunity: OpportunityItem }): React.ReactElement {
  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(opportunity.estimatedValue);

  const formattedWeighted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(opportunity.weightedValue);

  const closeDate = new Date(opportunity.expectedCloseDate).toLocaleDateString();

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="font-medium">{opportunity.name}</p>
            <StatusBadge
              status={opportunity.stage}
              variantMap={STAGE_VARIANT_MAP}
            />
          </div>
          <div className="text-right space-y-0.5">
            <p className="font-semibold">{formattedValue}</p>
            <p className="text-xs text-muted-foreground">
              Weighted: {formattedWeighted}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Close: {closeDate}</span>
          <span>Probability: {opportunity.probability}%</span>
          <span>Rep: {opportunity.repName}</span>
        </div>

        {opportunity.brands.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {opportunity.brands.map((brand) => (
              <span
                key={brand.id}
                className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs"
              >
                {brand.name}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OpportunitiesSkeleton(): React.ReactElement {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-3 w-48" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function OpportunitiesTab({ accountId }: OpportunitiesTabProps): React.ReactElement {
  const { data, isLoading, isError, refetch } = useAccountOpportunities(accountId);

  if (isLoading) {
    return <OpportunitiesSkeleton />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load opportunities"
        message="There was an error loading the opportunities."
        onRetry={() => void refetch()}
      />
    );
  }

  const opportunities = data?.data ?? [];
  const openOpportunities = opportunities.filter(
    (o) => o.stage !== 'closed_won' && o.stage !== 'closed_lost',
  );
  const closedOpportunities = opportunities.filter(
    (o) => o.stage === 'closed_won' || o.stage === 'closed_lost',
  );

  const totalWeighted = openOpportunities.reduce((sum, o) => sum + o.weightedValue, 0);
  const formattedPipeline = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(totalWeighted);

  if (opportunities.length === 0) {
    return (
      <EmptyState
        title="No opportunities"
        message="No opportunities linked to this account yet."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {openOpportunities.length} open
          {closedOpportunities.length > 0 && `, ${closedOpportunities.length} closed`}
        </p>
        <p className="text-sm font-medium">
          Weighted pipeline: {formattedPipeline}
        </p>
      </div>

      {openOpportunities.length > 0 && (
        <div className="space-y-2">
          {openOpportunities.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </div>
      )}

      {closedOpportunities.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Closed
          </p>
          {closedOpportunities.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </div>
      )}
    </div>
  );
}
