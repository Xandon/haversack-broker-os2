'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/patterns/page-header';
import { ErrorState } from '@/components/patterns/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOpportunityDetail } from '@/hooks/use-opportunity-mutations';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getStageBadgeVariant(stage: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (stage) {
    case 'closed_won':
      return 'default';
    case 'closed_lost':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function formatStageLabel(stage: string): string {
  return stage
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function DetailSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardContent className="space-y-3 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function OpportunityDetailPage(): React.ReactElement {
  const params = useParams();
  const opportunityId = params['id'] as string;

  const { data, isLoading, isError, refetch } = useOpportunityDetail(opportunityId);
  const opportunity = data?.data;

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isError || !opportunity) {
    return (
      <ErrorState
        title="Opportunity not found"
        message="The opportunity you're looking for could not be loaded."
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={opportunity.name}
        breadcrumbs={[
          { label: 'Pipeline', href: '/opportunities' },
          { label: opportunity.name },
        ]}
        actions={
          <Link href={`/opportunities/${opportunityId}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Value</p>
                  <p className="text-lg font-semibold">{formatCurrency(opportunity.estimatedValue)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weighted Value</p>
                  <p className="text-lg font-semibold">{formatCurrency(opportunity.weightedValue)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Probability</p>
                  <p className="text-lg font-semibold">{opportunity.probability}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expected Close</p>
                  <p className="text-lg font-semibold">{formatDate(opportunity.expectedCloseDate)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Stage</p>
                <Badge variant={getStageBadgeVariant(opportunity.stage)} className="mt-1">
                  {formatStageLabel(opportunity.stage)}
                </Badge>
              </div>

              {opportunity.closeReason && (
                <div>
                  <p className="text-sm text-muted-foreground">Close Reason</p>
                  <p className="mt-1 text-sm">{opportunity.closeReason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {opportunity.brands.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Associated Brands</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {opportunity.brands.map((brand) => (
                    <Badge key={brand.id} variant="secondary">
                      {brand.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Account</p>
                <Link
                  href={`/accounts/${opportunity.accountId}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {opportunity.accountName}
                </Link>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sales Rep</p>
                <p className="text-sm font-medium">{opportunity.repName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm">{formatDate(opportunity.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-sm">{formatDate(opportunity.updatedAt)}</p>
              </div>
              {opportunity.closedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Closed At</p>
                  <p className="text-sm">{formatDate(opportunity.closedAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
