'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ErrorBanner } from '@/components/shared/error-banner';
import { useAccounts } from '@/hooks/use-accounts';
import { useCreateOrder } from '@/hooks/use-orders';
import { useProductSearch, type Product } from '@/hooks/use-products';

type Step = 'account' | 'items' | 'review';

interface LineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export default function OrderEntryPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('account');
  const [accountId, setAccountId] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const { data: accounts } = useAccounts({ limit: 100 });
  const { data: searchResults } = useProductSearch(productSearch);
  const createOrder = useCreateOrder();

  const addLineItem = (product: Product) => {
    setLineItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.unitPrice,
      },
    ]);
    setProductSearch('');
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const total = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);

  const handleSubmit = () => {
    createOrder.mutate(
      {
        accountId,
        lineItems: lineItems.map(({ productId, quantity }) => ({ productId, quantity })),
      },
      {
        onSuccess: (result) => {
          router.push(`/orders/${result.data.id}`);
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">New Order</h1>

      {createOrder.error && (
        <ErrorBanner message="Unable to create order" onRetry={() => createOrder.reset()} />
      )}

      {/* Stepper */}
      <div className="flex items-center gap-4">
        {(['account', 'items', 'review'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`text-sm ${step === s ? 'font-medium text-gray-900' : 'text-gray-500'}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Step: Account Selection */}
      {step === 'account' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <label htmlFor="account" className="block text-sm font-medium text-gray-700">
            Select Account
          </label>
          <select
            id="account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Choose an account...</option>
            {accounts?.data.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setStep('items')}
            disabled={!accountId}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Step: Line Items */}
      {step === 'items' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <div>
            <label htmlFor="product-search" className="block text-sm font-medium text-gray-700">
              Search Products
            </label>
            <input
              id="product-search"
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Type to search products..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {searchResults?.data && searchResults.data.length > 0 && (
              <ul className="mt-2 max-h-40 overflow-y-auto rounded-md border border-gray-200 bg-white">
                {searchResults.data.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => addLineItem(p)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      {p.name} — ${p.unitPrice}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {lineItems.length > 0 && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Price</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Total</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lineItems.map((li, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-sm">{li.productName}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        value={li.quantity}
                        onChange={(e) => {
                          const qty = parseInt(e.target.value, 10) || 1;
                          setLineItems((prev) =>
                            prev.map((item, idx) =>
                              idx === i ? { ...item, quantity: qty } : item,
                            ),
                          );
                        }}
                        className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 text-sm">${li.unitPrice.toFixed(2)}</td>
                    <td className="px-3 py-2 text-sm">
                      ${(li.quantity * li.unitPrice).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeLineItem(i)}
                        className="text-red-600 text-sm hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep('account')}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep('review')}
              disabled={lineItems.length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step: Review */}
      {step === 'review' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold">Review Order</h2>
          <p className="text-sm text-gray-600">
            Account: {accounts?.data.find((a) => a.id === accountId)?.name}
          </p>
          <p className="text-sm text-gray-600">
            {lineItems.length} line items &middot; Total: ${total.toFixed(2)}
          </p>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep('items')}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createOrder.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createOrder.isPending ? 'Submitting...' : 'Submit Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
