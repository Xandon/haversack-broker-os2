'use client';

import { useRouter } from 'next/navigation';

import { AccountForm } from '@/components/accounts/account-form';
import { ErrorBanner } from '@/components/shared/error-banner';
import { useCreateAccount } from '@/hooks/use-accounts';

export default function NewAccountPage() {
  const router = useRouter();
  const createAccount = useCreateAccount();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>

      {createAccount.error && (
        <ErrorBanner message="Unable to create account" onRetry={() => createAccount.reset()} />
      )}

      <AccountForm
        onSubmit={(data) =>
          createAccount.mutate(data, {
            onSuccess: (result) => {
              router.push(`/accounts/${result.data.id}`);
            },
          })
        }
        isLoading={createAccount.isPending}
      />
    </div>
  );
}
