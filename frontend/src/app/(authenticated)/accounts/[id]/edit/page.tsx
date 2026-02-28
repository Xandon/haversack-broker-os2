'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/patterns/page-header';
import { AccountForm } from '@/components/accounts/account-form';
import { ErrorState } from '@/components/patterns/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAccountDetail, useUpdateAccount } from '@/hooks/use-account-detail';
import type { UpdateAccountInput } from '@/hooks/use-account-detail';

interface AccountFormData {
  name: string;
  accountType: 'retail' | 'restaurant' | 'distributor';
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  territoryId: string;
  parentAccountId?: string | null;
  primaryContact?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    title?: string;
  };
}

function EditAccountSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-48" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

export default function EditAccountPage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const accountId = params['id'] as string;
  const { data, isLoading, isError, refetch } = useAccountDetail(accountId);
  const updateAccount = useUpdateAccount();

  const handleSubmit = (formData: AccountFormData): void => {
    const input: UpdateAccountInput = {
      name: formData.name,
      accountType: formData.accountType,
      streetAddress: formData.streetAddress,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      territoryId: formData.territoryId,
      parentAccountId: formData.parentAccountId ?? null,
    };

    updateAccount.mutate(
      { accountId, input },
      {
        onSuccess: () => {
          toast.success('Account updated successfully');
          router.push(`/accounts/${accountId}`);
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to update account');
        },
      },
    );
  };

  const handleCancel = (): void => {
    router.push(`/accounts/${accountId}`);
  };

  if (isLoading) {
    return <EditAccountSkeleton />;
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
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${account.name}`}
        breadcrumbs={[
          { label: 'Accounts', href: '/accounts' },
          { label: account.name, href: `/accounts/${accountId}` },
          { label: 'Edit' },
        ]}
      />
      <AccountForm
        mode="edit"
        defaultValues={{
          name: account.name,
          accountType: account.accountType as 'retail' | 'restaurant' | 'distributor',
          streetAddress: account.streetAddress,
          city: account.city,
          state: account.state,
          zipCode: account.zipCode,
          territoryId: account.territoryId,
          parentAccountId: account.parentAccountId,
        }}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={updateAccount.isPending}
      />
    </div>
  );
}
