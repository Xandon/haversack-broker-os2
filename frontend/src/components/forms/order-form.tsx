'use client';

import { useState, useCallback } from 'react';

import { ProductSearch } from '@/components/orders/product-search';
import { OrderLineItem, type LineItemData } from '@/components/orders/order-line-item';
import { useCreateOrder, type ProductSearchResult, type CreateOrderPayload } from '@/hooks/use-orders';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface OrderFormProps {
  accountId: string;
  accountName: string;
  onSuccess?: () => void;
}

// -------------------------------------------------------------------
// OrderForm Component (T091 — FR-013, FR-015)
// -------------------------------------------------------------------

export function OrderForm({ accountId, accountName, onSuccess }: OrderFormProps): JSX.Element {
  const [lineItems, setLineItems] = useState<LineItemData[]>([]);
  const [notes, setNotes] = useState('');
  const { createOrder, isLoading, isError, error, isSuccess, data } = useCreateOrder();

  const handleAddProduct = useCallback(
    (product: ProductSearchResult) => {
      // Check for duplicate product
      const existing = lineItems.findIndex((li) => li.product_id === product.id);
      if (existing >= 0) {
        // Increment quantity instead of adding duplicate
        setLineItems((prev) =>
          prev.map((li, i) =>
            i === existing ? { ...li, quantity: li.quantity + 1 } : li,
          ),
        );
        return;
      }

      const effectivePrice =
        product.promo_active && product.promo_price != null
          ? product.promo_price
          : product.unit_price;

      const newItem: LineItemData = {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        brand_name: product.brand?.name ?? 'Unknown',
        quantity: 1,
        unit_price: effectivePrice,
        revenue_model: product.revenue_model,
        promo_applied: product.promo_active && product.promo_price != null,
        original_price: product.unit_price,
      };

      setLineItems((prev) => [...prev, newItem]);
    },
    [lineItems],
  );

  const handleQuantityChange = useCallback((index: number, quantity: number) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity } : item)),
    );
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (lineItems.length === 0) return;

      const payload: CreateOrderPayload = {
        account_id: accountId,
        notes: notes || undefined,
        items: lineItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          revenue_model: item.revenue_model,
        })),
      };

      createOrder(payload, {
        onSuccess: () => {
          setLineItems([]);
          setNotes('');
          onSuccess?.();
        },
      });
    },
    [accountId, notes, lineItems, createOrder, onSuccess],
  );

  const approvalRequired = subtotal >= 5000;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Account context */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-500">Creating order for</p>
        <p className="text-lg font-semibold text-gray-900">{accountName}</p>
      </div>

      {/* Product search */}
      <ProductSearch onSelect={handleAddProduct} />

      {/* Line items */}
      {lineItems.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-4 py-2 px-4 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="flex-1">Product</div>
            <div className="w-20 text-right">Price</div>
            <div className="w-24 text-center">Qty</div>
            <div className="w-24 text-right">Total</div>
            <div className="w-6" />
          </div>

          {/* Items */}
          {lineItems.map((item, index) => (
            <OrderLineItem
              key={item.product_id}
              item={item}
              index={index}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemoveItem}
            />
          ))}

          {/* Subtotal */}
          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 border-t border-gray-200">
            <div className="text-sm font-medium text-gray-700">
              {lineItems.length} item{lineItems.length !== 1 ? 's' : ''}
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-500 mr-2">Subtotal:</span>
              <span className="text-lg font-bold text-gray-900">
                ${subtotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Approval warning (FR-017) */}
      {approvalRequired && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-yellow-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Manager Approval Required
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Orders of $5,000 or more require manager approval before confirmation.
                This order totals ${subtotal.toFixed(2)}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label htmlFor="order-notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes (optional)
        </label>
        <textarea
          id="order-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="Add any notes about this order..."
        />
      </div>

      {/* Error message */}
      {isError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">
            {error?.message ?? 'Failed to create order. Please try again.'}
          </p>
        </div>
      )}

      {/* Success message */}
      {isSuccess && data && (
        <div className="rounded-md bg-green-50 border border-green-200 p-4">
          <p className="text-sm text-green-700">
            Order {data.data.order_number} created successfully!
            {data.data.vendor_sub_orders && data.data.vendor_sub_orders.length > 0 && (
              <span>
                {' '}Split into {data.data.vendor_sub_orders.length} vendor sub-orders.
              </span>
            )}
          </p>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={lineItems.length === 0 || isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating Order...' : 'Create Order'}
        </button>
      </div>
    </form>
  );
}
