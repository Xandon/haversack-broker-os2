'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { OrderForm } from '@/components/forms/order-form';
import { useAccounts, type Account } from '@/hooks/use-accounts';

// -------------------------------------------------------------------
// New Order Page (T092 — FR-013)
// -------------------------------------------------------------------

export default function NewOrderPage(): JSX.Element {
  const router = useRouter();
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountSearch, setAccountSearch] = useState('');
  const { accounts, isLoading: accountsLoading } = useAccounts({
    search: accountSearch || undefined,
    limit: 10,
  });

  const handleSuccess = (): void => {
    router.push('/orders');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Order</h1>
        <p className="mt-1 text-sm text-gray-500">
          Search and add products to create an order.
        </p>
      </div>

      {/* Account selection */}
      {!selectedAccount ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Select Account
          </h2>
          <input
            type="text"
            value={accountSearch}
            onChange={(e) => setAccountSearch(e.target.value)}
            placeholder="Search for an account..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mb-3"
          />

          {accountsLoading && (
            <div className="text-sm text-gray-500">Searching...</div>
          )}

          {!accountsLoading && accounts.length === 0 && accountSearch && (
            <div className="text-sm text-gray-500">No accounts found.</div>
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => setSelectedAccount(account)}
                className="w-full text-left px-4 py-3 rounded-md border border-gray-200 hover:bg-gray-50 hover:border-blue-300"
              >
                <div className="text-sm font-medium text-gray-900">
                  {account.name}
                </div>
                <div className="text-xs text-gray-500">
                  {account.city}, {account.state}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-sm text-gray-500">Account:</span>
              <span className="ml-2 text-sm font-medium text-gray-900">
                {selectedAccount.name}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAccount(null)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Change
            </button>
          </div>

          <OrderForm
            accountId={selectedAccount.id}
            accountName={selectedAccount.name}
            onSuccess={handleSuccess}
          />
        </div>
      )}
    </div>
  );
}
