'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HealthScoreBadge } from '@/components/accounts/health-score-badge';
import type { AccountDetail, HealthScoreBreakdown } from '@/hooks/use-account-detail';

interface OverviewTabProps {
  account: AccountDetail;
}

function MetadataRow({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-baseline justify-between py-2 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function HealthScoreCard({
  score,
  breakdown,
  calculatedAt,
}: {
  score: number | null;
  breakdown: HealthScoreBreakdown | null;
  calculatedAt: string | null;
}): React.ReactElement {
  if (score === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Health Score</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Pending calculation — scores are updated nightly at 02:00 UTC.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Health Score</CardTitle>
        <HealthScoreBadge score={score} className="text-sm" />
      </CardHeader>
      <CardContent className="space-y-3">
        {breakdown && (
          <div className="space-y-2">
            <ScoreFactor label="Activity Recency" factor={breakdown.daysSinceLastActivity} />
            <ScoreFactor label="Order Frequency" factor={breakdown.orderFrequency} />
            <ScoreFactor label="Order Value Trend" factor={breakdown.orderValueTrend} />
            <ScoreFactor label="Contact Engagement" factor={breakdown.contactEngagement} />
          </div>
        )}
        {calculatedAt && (
          <p className="text-xs text-muted-foreground">
            Last calculated: {new Date(calculatedAt).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreFactor({
  label,
  factor,
}: {
  label: string;
  factor: { value: number; score: number; weight: number };
}): React.ReactElement {
  const weightPercent = Math.round(factor.weight * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label} ({weightPercent}%)</span>
        <span className="font-medium">{factor.score}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className="h-1.5 rounded-full bg-primary transition-all"
          style={{ width: `${factor.score}%` }}
        />
      </div>
    </div>
  );
}

function HierarchyCard({
  parentAccount,
  childAccounts,
}: {
  parentAccount: AccountDetail['parentAccount'];
  childAccounts: AccountDetail['childAccounts'];
}): React.ReactElement | null {
  if (!parentAccount && childAccounts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Account Hierarchy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {parentAccount && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Parent Account
            </p>
            <Link
              href={`/accounts/${parentAccount.id}`}
              className="text-sm text-primary hover:underline"
            >
              {parentAccount.name}
            </Link>
          </div>
        )}
        {childAccounts.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Child Accounts ({childAccounts.length})
            </p>
            <ul className="space-y-1">
              {childAccounts.map((child) => (
                <li key={child.id}>
                  <Link
                    href={`/accounts/${child.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OverviewTab({ account }: OverviewTabProps): React.ReactElement {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <MetadataRow label="Account Type" value={formatAccountType(account.accountType)} />
          <MetadataRow label="Territory" value={account.territory.name} />
          <MetadataRow
            label="Address"
            value={`${account.streetAddress}, ${account.city}, ${account.state} ${account.zipCode}`}
          />
          <MetadataRow
            label="Created"
            value={new Date(account.createdAt).toLocaleDateString()}
          />
          <MetadataRow
            label="Last Updated"
            value={new Date(account.updatedAt).toLocaleDateString()}
          />
          <MetadataRow
            label="Status"
            value={account.isActive ? 'Active' : 'Inactive'}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <HealthScoreCard
          score={account.healthScore}
          breakdown={account.healthScoreBreakdown}
          calculatedAt={account.healthScoreCalculatedAt}
        />
        <HierarchyCard
          parentAccount={account.parentAccount}
          childAccounts={account.childAccounts}
        />
      </div>
    </div>
  );
}

function formatAccountType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
