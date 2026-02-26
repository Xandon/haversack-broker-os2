'use client';

import { useState, useCallback } from 'react';

import { useProductSearch, type ProductSearchResult } from '@/hooks/use-orders';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface ProductSearchProps {
  onSelect: (product: ProductSearchResult) => void;
}

// -------------------------------------------------------------------
// Availability color mapping (FR-015)
// -------------------------------------------------------------------

function getAvailabilityColor(status: string): string {
  switch (status) {
    case 'in_stock':
      return 'bg-green-100 text-green-800';
    case 'limited':
      return 'bg-yellow-100 text-yellow-800';
    case 'out_of_stock':
      return 'bg-red-100 text-red-800';
    case 'discontinued':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-500';
  }
}

function formatAvailability(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// -------------------------------------------------------------------
// ProductSearch Component (T088 — FR-015)
// -------------------------------------------------------------------

export function ProductSearch({ onSelect }: ProductSearchProps): JSX.Element {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { products, isLoading } = useProductSearch(query, query.length >= 1);

  const handleSelect = useCallback(
    (product: ProductSearchResult) => {
      onSelect(product);
      setQuery('');
      setIsOpen(false);
    },
    [onSelect],
  );

  return (
    <div className="relative">
      <label htmlFor="product-search" className="block text-sm font-medium text-gray-700 mb-1">
        Search Products
      </label>
      <input
        id="product-search"
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search by name, SKU, brand, or category..."
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        autoComplete="off"
      />

      {isOpen && query.length >= 1 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-80 overflow-y-auto">
          {isLoading && (
            <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
          )}

          {!isLoading && products.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500">
              No products found for &quot;{query}&quot;
            </div>
          )}

          {products.map((product) => {
            const effectivePrice = product.promo_active && product.promo_price
              ? product.promo_price
              : product.unit_price;

            return (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelect(product)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {product.sku} · {product.brand?.name ?? 'Unknown Brand'} · {product.category}
                    </div>
                    {product.certifications.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {product.certifications.map((cert) => (
                          <span
                            key={cert}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700"
                          >
                            {cert}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 text-right flex-shrink-0">
                    <div className="text-sm font-semibold text-gray-900">
                      ${effectivePrice.toFixed(2)}
                    </div>
                    {product.promo_active && product.promo_price && (
                      <div className="text-xs text-gray-400 line-through">
                        ${product.unit_price.toFixed(2)}
                      </div>
                    )}
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mt-1 ${getAvailabilityColor(product.availability_status)}`}
                    >
                      {formatAvailability(product.availability_status)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
