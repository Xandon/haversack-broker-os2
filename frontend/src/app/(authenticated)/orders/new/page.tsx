'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/patterns/page-header';
import { ErrorState } from '@/components/patterns/error-state';
import { OrderForm } from '@/components/orders/order-form';
import { SearchCombobox } from '@/components/patterns/search-combobox';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useCreateOrder } from '@/hooks/use-orders';
import { apiClient } from '@/lib/api-client';
import type { CreateOrderInput } from '@haversack/shared';
import type { AccountListItem, AccountListResponse } from '@/hooks/use-accounts';

async function searchAccounts(query: string): Promise<AccountListItem[]> {
  if (query.length < 2) return [];
  const response = await apiClient<AccountListResponse>(
    `/api/accounts?search=${encodeURIComponent(query)}&limit=10`,
  );
  return response.data;
}

export default function NewOrderPage(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAccountId = searchParams.get('accountId');
  const preselectedAccountName = searchParams.get('accountName');

  const [selectedAccount, setSelectedAccount] = React.useState<{
    id: string;
    name: string;
  } | null>(
    preselectedAccountId && preselectedAccountName
      ? { id: preselectedAccountId, name: preselectedAccountName }
      : null,
  );

  const createOrder = useCreateOrder();
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  function handleSubmit(input: CreateOrderInput): void {
    setSubmitError(null);
    createOrder.mutate(input, {
      onSuccess: (response) => {
        router.push(`/orders/${response.data.id}`);
      },
      onError: (error) => {
        setSubmitError(error.message || 'Failed to create order. Please try again.');
      },
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <PageHeader
        title="New Order"
        breadcrumbs={[
          { label: 'Orders', href: '/orders' },
          { label: 'New Order' },
        ]}
      />

      {!selectedAccount ? (
        <Card className="p-4">
          <Label className="mb-2 block text-sm font-medium">Select Account</Label>
          <SearchCombobox<AccountListItem>
            onSearch={searchAccounts}
            placeholder="Search accounts by name..."
            onSelect={(account) => setSelectedAccount({ id: account.id, name: account.name })}
            renderItem={(account) => (
              <div>
                <p className="font-medium">{account.name}</p>
                <p className="text-xs text-muted-foreground">
                  {account.territory?.name ?? 'No territory'} &middot; {account.accountType}
                </p>
              </div>
            )}
          />
        </Card>
      ) : (
        <>
          <OrderForm
            accountId={selectedAccount.id}
            accountName={selectedAccount.name}
            onSubmit={handleSubmit}
            isSubmitting={createOrder.isPending}
          />

          {submitError && (
            <ErrorState
              title="Order creation failed"
              message={submitError}
              onRetry={() => setSubmitError(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
