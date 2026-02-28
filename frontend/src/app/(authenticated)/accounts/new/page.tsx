'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/patterns/page-header';
import { AccountForm } from '@/components/accounts/account-form';
import { useCreateAccount } from '@/hooks/use-create-account';
import type { CreateAccountInput } from '@haversack/shared';

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

export default function CreateAccountPage(): React.ReactElement {
  const router = useRouter();
  const createAccount = useCreateAccount();

  const handleSubmit = (data: AccountFormData, skipDuplicateCheck: boolean): void => {
    const input: CreateAccountInput = {
      name: data.name,
      accountType: data.accountType,
      streetAddress: data.streetAddress,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      territoryId: data.territoryId,
      parentAccountId: data.parentAccountId ?? null,
      primaryContact: {
        firstName: data.primaryContact?.firstName ?? '',
        lastName: data.primaryContact?.lastName ?? '',
        email: data.primaryContact?.email || undefined,
        phone: data.primaryContact?.phone || undefined,
        title: data.primaryContact?.title || undefined,
      },
      skipDuplicateCheck,
    };

    createAccount.mutate(input, {
      onSuccess: (response) => {
        toast.success('Account created successfully');
        router.push(`/accounts/${response.data.id}`);
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to create account');
      },
    });
  };

  const handleCancel = (): void => {
    router.push('/accounts');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Account"
        breadcrumbs={[
          { label: 'Accounts', href: '/accounts' },
          { label: 'New Account' },
        ]}
      />
      <AccountForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={createAccount.isPending}
      />
    </div>
  );
}
