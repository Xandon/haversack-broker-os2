'use client';

import { useCriticalAccounts } from '@/hooks/use-dashboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function CriticalAccountsList(): React.ReactElement {
  const { data: accounts, isLoading } = useCriticalAccounts();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Critical Accounts</CardTitle>
      </CardHeader>
      <CardContent>
        {!accounts || accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No critical accounts</p>
        ) : (
          <ul className="space-y-2">
            {accounts.map((account) => (
              <li key={account.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{account.name}</p>
                  <p className="text-xs text-muted-foreground">{account.territory}</p>
                </div>
                <span className="rounded bg-destructive/10 px-2 py-0.5 text-sm font-medium text-destructive">
                  {account.healthScore}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
