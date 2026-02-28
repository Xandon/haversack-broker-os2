'use client';

import type { Product } from '@/hooks/use-products';

interface ProductCardProps {
  product: Product;
  onClick?: (product: Product) => void;
}

const STATUS_COLORS: Record<string, string> = {
  in_stock: 'bg-green-100 text-green-800',
  limited: 'bg-yellow-100 text-yellow-800',
  out_of_stock: 'bg-red-100 text-red-800',
  discontinued: 'bg-gray-100 text-gray-800',
};

const STATUS_LABELS: Record<string, string> = {
  in_stock: 'In Stock',
  limited: 'Limited',
  out_of_stock: 'Out of Stock',
  discontinued: 'Discontinued',
};

export function ProductCard({ product, onClick }: ProductCardProps) {
  const hasPromo =
    product.promoPrice !== null &&
    product.promoPrice !== undefined &&
    product.promoEndDate &&
    new Date(product.promoEndDate) >= new Date();

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(product)}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-gray-900">{product.name}</h3>
          <p className="text-xs text-gray-500">{product.sku}</p>
          {product.brand && <p className="text-xs text-blue-600">{product.brand.name}</p>}
        </div>
        <span
          className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            STATUS_COLORS[product.availabilityStatus] ?? STATUS_COLORS.in_stock
          }`}
        >
          {STATUS_LABELS[product.availabilityStatus] ?? product.availabilityStatus}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        {hasPromo ? (
          <>
            <span className="text-lg font-semibold text-green-600">
              ${product.promoPrice?.toFixed(2)}
            </span>
            <span className="text-sm text-gray-400 line-through">
              ${product.unitPrice.toFixed(2)}
            </span>
          </>
        ) : (
          <span className="text-lg font-semibold text-gray-900">
            ${product.unitPrice.toFixed(2)}
          </span>
        )}
        <span className="text-xs text-gray-500">{product.revenueModel}</span>
      </div>

      {product.certifications.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {product.certifications.map((cert) => (
            <span
              key={cert}
              className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
            >
              {cert}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
