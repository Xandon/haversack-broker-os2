'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorState } from '@/components/patterns/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountDetailHeader } from '@/components/accounts/account-detail-header';
import { OverviewTab } from '@/components/accounts/overview-tab';
import { ContactsTab } from '@/components/accounts/contacts-tab';
import { TimelineTab } from '@/components/accounts/timeline-tab';
import { OrdersTab } from '@/components/accounts/orders-tab';
import { OpportunitiesTab } from '@/components/accounts/opportunities-tab';
import { useAccountDetail } from '@/hooks/use-account-detail';

function AccountDetailSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-9 w-80" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}

export default function AccountDetailPage(): React.ReactElement {
  const params = useParams();
  const accountId = params.id as string;
  const { data, isLoading, isError, refetch } = useAccountDetail(accountId);

  if (isLoading) {
    return <AccountDetailSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <ErrorState
          title="Failed to load account"
          message="There was an error loading the account details. Please try again."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const account = data.data;

  return (
    <div className="space-y-6 p-6">
      <AccountDetailHeader account={account} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">
            Contacts ({account.contacts.length})
          </TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab account={account} />
        </TabsContent>

        <TabsContent value="contacts">
          <ContactsTab accountId={account.id} contacts={account.contacts} />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineTab accountId={account.id} />
        </TabsContent>

        <TabsContent value="orders">
          <OrdersTab accountId={account.id} />
        </TabsContent>

        <TabsContent value="opportunities">
          <OpportunitiesTab accountId={account.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
