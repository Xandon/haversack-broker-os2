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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th scope="col" className="pb-2 pr-4 font-medium">Account</th>
                  <th scope="col" className="pb-2 pr-4 font-medium">Territory</th>
                  <th scope="col" className="pb-2 text-right font-medium">Health Score</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{account.name}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{account.territory}</td>
                    <td className="py-2 text-right">
                      <span className="rounded bg-destructive/10 px-2 py-0.5 text-sm font-medium text-destructive">
                        {account.healthScore}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
