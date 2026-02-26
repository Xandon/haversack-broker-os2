'use client';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface LineItemData {
  product_id: string;
  product_name: string;
  product_sku: string;
  brand_name: string;
  quantity: number;
  unit_price: number;
  revenue_model: 'broker' | 'wholesale';
  promo_applied: boolean;
  original_price: number;
}

interface OrderLineItemProps {
  item: LineItemData;
  index: number;
  onQuantityChange: (index: number, quantity: number) => void;
  onRemove: (index: number) => void;
}

// -------------------------------------------------------------------
// OrderLineItem Component (T089 — FR-013)
// -------------------------------------------------------------------

export function OrderLineItem({
  item,
  index,
  onQuantityChange,
  onRemove,
}: OrderLineItemProps): JSX.Element {
  const lineTotal = item.quantity * item.unit_price;

  return (
    <div className="flex items-center gap-4 py-3 px-4 border-b border-gray-100 last:border-b-0">
      {/* Product info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {item.product_name}
        </div>
        <div className="text-xs text-gray-500">
          {item.product_sku} · {item.brand_name}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
              item.revenue_model === 'broker'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-purple-50 text-purple-700'
            }`}
          >
            {item.revenue_model === 'broker' ? 'Broker' : 'Wholesale'}
          </span>
          {item.promo_applied && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700">
              Promo
            </span>
          )}
        </div>
      </div>

      {/* Unit price */}
      <div className="text-right w-20">
        <div className="text-sm text-gray-900">${item.unit_price.toFixed(2)}</div>
        {item.promo_applied && (
          <div className="text-xs text-gray-400 line-through">
            ${item.original_price.toFixed(2)}
          </div>
        )}
      </div>

      {/* Quantity */}
      <div className="w-24">
        <input
          type="number"
          min={1}
          value={item.quantity}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (val >= 1) {
              onQuantityChange(index, val);
            }
          }}
          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          aria-label={`Quantity for ${item.product_name}`}
        />
      </div>

      {/* Line total */}
      <div className="text-right w-24">
        <div className="text-sm font-semibold text-gray-900">
          ${lineTotal.toFixed(2)}
        </div>
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="text-gray-400 hover:text-red-500 p-1"
        aria-label={`Remove ${item.product_name}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
