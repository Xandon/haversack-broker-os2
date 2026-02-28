'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { HealthScoreBadge } from '@/components/accounts/health-score-badge';
import { StatusBadge } from '@/components/patterns/status-badge';
import type { AccountDetail } from '@/hooks/use-account-detail';

interface AccountDetailHeaderProps {
  account: AccountDetail;
}

export function AccountDetailHeader({ account }: AccountDetailHeaderProps): React.ReactElement {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Link
            href="/accounts"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Accounts
          </Link>
          <span className="text-sm text-muted-foreground">/</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight">{account.name}</h1>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={account.accountType} />
          <span className="text-sm text-muted-foreground">
            {account.territory.name}
          </span>
          <HealthScoreBadge score={account.healthScore} />
          {!account.isActive && (
            <StatusBadge status="inactive" />
          )}
        </div>

        {account.streetAddress && (
          <p className="text-sm text-muted-foreground">
            {account.streetAddress}, {account.city}, {account.state} {account.zipCode}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/accounts/${account.id}/edit`)}
        >
          Edit
        </Button>
        <Button onClick={() => router.push(`/orders/new?accountId=${account.id}`)}>
          New Order
        </Button>
      </div>
    </div>
  );
}
