'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { AccountForm } from '@/components/forms/account-form';
import type { AccountFormValues } from '@/components/forms/account-form';
import { SkeletonLoader } from '@/components/shared/skeleton-loader';
import { useCheckDuplicates, useCreateAccount } from '@/hooks/use-accounts';
import type { CreateAccountPayload } from '@/hooks/use-accounts';
import { useAuth } from '@/providers/auth-provider';

// -------------------------------------------------------------------
// Page component
// -------------------------------------------------------------------

export default function NewAccountPage(): React.JSX.Element {
  const router = useRouter();
  const { user } = useAuth();
  const { createAccountAsync, isLoading: isCreating } = useCreateAccount();
  const {
    checkDuplicates,
    duplicates,
    isLoading: isCheckingDuplicates,
    reset: resetDuplicates,
  } = useCheckDuplicates();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingValues, setPendingValues] = useState<AccountFormValues | null>(null);

  const tenantId = user?.tenantId ?? '';

  const handleNameBlur = useCallback(
    (name: string): void => {
      if (tenantId) {
        resetDuplicates();
        setPendingValues(null);
        checkDuplicates({ name, tenantId });
      }
    },
    [tenantId, checkDuplicates, resetDuplicates],
  );

  const submitAccount = useCallback(
    async (values: AccountFormValues): Promise<void> => {
      setErrorMessage(null);
      setSuccessMessage(null);

      const payload: CreateAccountPayload = {
        name: values.name,
        account_type: values.accountType,
        address_line1: values.addressLine1,
        address_line2: values.addressLine2 || undefined,
        city: values.city,
        state: values.state,
        zip_code: values.zipCode,
        phone: values.phone || undefined,
        email: values.email || undefined,
        website: values.website || undefined,
        notes: values.notes || undefined,
        territory_id: values.territoryId || tenantId,
        assigned_rep_id: values.assignedRepId || undefined,
        tenant_id: tenantId,
      };

      try {
        const response = await createAccountAsync(payload);
        setSuccessMessage('Account created successfully.');
        // Redirect to the new account detail page (fallback to list)
        const accountId = response?.data?.id;
        if (accountId) {
          router.push(`/accounts/${accountId}`);
        } else {
          router.push('/accounts');
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
        setErrorMessage(message);
      }
    },
    [tenantId, createAccountAsync, router],
  );

  const handleSubmit = useCallback(
    (values: AccountFormValues): void => {
      // If there are duplicates and the user has not explicitly dismissed them,
      // store the pending values and wait for "Create Anyway"
      if (duplicates.length > 0 && pendingValues === null) {
        setPendingValues(values);
        return;
      }
      void submitAccount(values);
    },
    [duplicates, pendingValues, submitAccount],
  );

  const handleCreateAnyway = useCallback((): void => {
    if (pendingValues) {
      void submitAccount(pendingValues);
    }
    resetDuplicates();
    setPendingValues(null);
  }, [pendingValues, submitAccount, resetDuplicates]);

  const handleViewExisting = useCallback(
    (id: string): void => {
      router.push(`/accounts/${id}`);
    },
    [router],
  );

  const isLoading = isCreating || isCheckingDuplicates;

  return (
    <div>
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push('/accounts')}
          className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          aria-label="Back to accounts list"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Accounts
        </button>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Create New Account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Fill in the details below to add a new account to the system.
        </p>
      </div>

      {/* Success message */}
      {successMessage ? (
        <div
          role="status"
          className="mb-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {successMessage}
        </div>
      ) : null}

      {/* Error message */}
      {errorMessage ? (
        <div
          role="alert"
          className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {errorMessage}
        </div>
      ) : null}

      {/* Loading overlay when saving */}
      {isCreating ? (
        <div className="mb-4">
          <SkeletonLoader variant="card" />
        </div>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <AccountForm
          onSubmit={handleSubmit}
          onNameBlur={handleNameBlur}
          isLoading={isLoading}
          duplicates={duplicates}
          onViewExisting={handleViewExisting}
          onCreateAnyway={handleCreateAnyway}
        />
      </div>
    </div>
  );
}
