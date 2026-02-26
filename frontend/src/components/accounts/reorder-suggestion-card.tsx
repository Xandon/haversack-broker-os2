'use client';

/**
 * Reorder suggestion card component.
 * Displays AI-generated reorder suggestions on the account detail page.
 * Users can modify quantities, remove items, and submit as a new order.
 * Implements FR-018, FR-035, FR-036.
 */
import { useState } from 'react';

import { AiLabel } from '@/components/shared/ai-label';
import {
  useReorderSuggestion,
  useSubmitReorder,
} from '@/hooks/use-ai';
import type { ReorderSuggestionItem } from '@/hooks/use-ai';
import { SkeletonLoader } from '@/components/shared/skeleton-loader';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface ReorderSuggestionCardProps {
  accountId: string;
}

interface EditableItem extends ReorderSuggestionItem {
  removed: boolean;
  editedQuantity: number;
}

// -------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------

function SuggestionItemRow({
  item,
  onQuantityChange,
  onRemove,
}: {
  item: EditableItem;
  onQuantityChange: (qty: number) => void;
  onRemove: () => void;
}): React.JSX.Element | null {
  if (item.removed) return null;

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2 pr-3">
        <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
        <div className="text-xs text-gray-500">
          {item.sku} — {item.brand_name}
        </div>
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={1}
          value={item.editedQuantity}
          onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label={`Quantity for ${item.product_name}`}
        />
      </td>
      <td className="px-3 py-2 text-right text-sm text-gray-700">
        ${item.unit_price.toFixed(2)}
      </td>
      <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">
        ${(item.unit_price * item.editedQuantity).toFixed(2)}
      </td>
      <td className="py-2 pl-3 text-right">
        <button
          type="button"
          onClick={onRemove}
          className="min-h-[44px] min-w-[44px] rounded p-1 text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          aria-label={`Remove ${item.product_name}`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

// -------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------

export function ReorderSuggestionCard({
  accountId,
}: ReorderSuggestionCardProps): React.JSX.Element | null {
  const { suggestion, isLoading, isError, error } = useReorderSuggestion(accountId);
  const { submitReorder, isLoading: isSubmitting, isSuccess } = useSubmitReorder();
  const [editableItems, setEditableItems] = useState<EditableItem[] | null>(null);

  // Initialize editable items from suggestion
  if (suggestion?.suggestion?.items && editableItems === null) {
    setEditableItems(
      suggestion.suggestion.items.map((item) => ({
        ...item,
        removed: false,
        editedQuantity: item.suggested_quantity,
      })),
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <SkeletonLoader variant="text" className="mb-3 h-5 w-48" />
        <SkeletonLoader variant="card" className="h-32" />
      </div>
    );
  }

  // FR-036: AI service unavailable
  if (isError) {
    const errorMessage =
      error?.message?.includes('503') || error?.message?.includes('unavailable')
        ? 'AI service temporarily unavailable — please try again in a few minutes'
        : 'Unable to generate suggestions';

    return (
      <div
        className="rounded-lg border border-yellow-200 bg-yellow-50 p-4"
        role="alert"
        data-testid="reorder-suggestion-error"
      >
        <p className="text-sm text-yellow-800">{errorMessage}</p>
      </div>
    );
  }

  // No suggestion data
  if (!suggestion) return null;

  // FR-018: Not enough order history
  if (!suggestion.ai_generated && suggestion.message) {
    return (
      <div
        className="rounded-lg border border-gray-200 bg-gray-50 p-4"
        data-testid="reorder-suggestion-insufficient"
      >
        <p className="text-sm text-gray-600">{suggestion.message}</p>
      </div>
    );
  }

  // No suggestion items
  if (!suggestion.suggestion || suggestion.suggestion.items.length === 0) return null;

  const items = editableItems ?? [];
  const activeItems = items.filter((item) => !item.removed);
  const calculatedTotal = activeItems.reduce(
    (sum, item) => sum + item.unit_price * item.editedQuantity,
    0,
  );

  const handleQuantityChange = (index: number, qty: number): void => {
    setEditableItems((prev) =>
      (prev ?? []).map((item, i) =>
        i === index ? { ...item, editedQuantity: qty } : item,
      ),
    );
  };

  const handleRemove = (index: number): void => {
    setEditableItems((prev) =>
      (prev ?? []).map((item, i) =>
        i === index ? { ...item, removed: true } : item,
      ),
    );
  };

  const handleSubmit = (): void => {
    submitReorder({
      account_id: accountId,
      items: activeItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.editedQuantity,
        unit_price: item.unit_price,
      })),
      notes: 'Created from AI reorder suggestion',
    });
  };

  if (isSuccess) {
    return (
      <div
        className="rounded-lg border border-green-200 bg-green-50 p-4"
        role="status"
        data-testid="reorder-suggestion-success"
      >
        <p className="text-sm font-medium text-green-800">
          Order created successfully from reorder suggestion.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white shadow-sm"
      data-testid="reorder-suggestion-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Suggested Reorder</h3>
          <AiLabel />
        </div>
        <span className="text-xs text-gray-500">
          Based on {suggestion.suggestion.based_on_orders} orders
        </span>
      </div>

      {/* Items table */}
      <div className="overflow-x-auto px-4">
        <table className="w-full" role="table">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-medium uppercase text-gray-500">
              <th className="py-2 pr-3 text-left">Product</th>
              <th className="px-3 py-2 text-center">Qty</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="py-2 pl-3 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <SuggestionItemRow
                key={item.product_id}
                item={item}
                onQuantityChange={(qty) => handleQuantityChange(index, qty)}
                onRemove={() => handleRemove(index)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with total and submit */}
      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
        <div className="text-sm">
          <span className="text-gray-500">Estimated total: </span>
          <span className="font-semibold text-gray-900">${calculatedTotal.toFixed(2)}</span>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={activeItems.length === 0 || isSubmitting}
          className="inline-flex min-h-[44px] items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit as Order'}
        </button>
      </div>
    </div>
  );
}
