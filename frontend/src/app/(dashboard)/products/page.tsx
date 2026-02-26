'use client';

/**
 * Product catalog page with certification and category filters.
 * Implements FR-019 (product catalog with filtering).
 */
import { useState } from 'react';

import Link from 'next/link';

import { EmptyState } from '@/components/shared/empty-state';
import { SkeletonLoader } from '@/components/shared/skeleton-loader';
import { useProductList } from '@/hooks/use-products';
import type { ProductListFilters } from '@/hooks/use-products';
import { useGenerateLineCard } from '@/hooks/use-products';

// Controlled vocabulary for certifications and allergens
const CERTIFICATIONS = ['Organic', 'Non-GMO', 'Kosher', 'Fair Trade'];
const CATEGORIES = ['Honey', 'Condiments', 'Sauces', 'Snacks', 'Beverages', 'Dairy', 'Baked Goods', 'Preserves'];
const AVAILABILITY_OPTIONS = [
  { value: 'in_stock', label: 'In Stock', color: 'bg-green-100 text-green-800' },
  { value: 'limited', label: 'Limited', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'out_of_stock', label: 'Out of Stock', color: 'bg-red-100 text-red-800' },
  { value: 'discontinued', label: 'Discontinued', color: 'bg-gray-100 text-gray-800' },
];

function getAvailabilityBadge(status: string): { label: string; color: string } {
  return AVAILABILITY_OPTIONS.find((o) => o.value === status) ?? { label: status, color: 'bg-gray-100 text-gray-800' };
}

export default function ProductCatalogPage(): React.JSX.Element {
  const [filters, setFilters] = useState<ProductListFilters>({
    page: 1,
    per_page: 25,
    is_active: true,
  });

  const { products, pagination, isLoading, isError } = useProductList(filters);
  const { generateLineCard, isLoading: isGenerating } = useGenerateLineCard();

  const handleFilterChange = (key: keyof ProductListFilters, value: string | undefined): void => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  const handlePageChange = (page: number): void => {
    setFilters((prev) => ({ ...prev, page }));
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Certification filter */}
          <div>
            <label htmlFor="filter-certification" className="block text-sm font-medium text-gray-700">
              Certification
            </label>
            <select
              id="filter-certification"
              className="mt-1 block w-full min-h-[44px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={filters.certification ?? ''}
              onChange={(e) => handleFilterChange('certification', e.target.value)}
            >
              <option value="">All Certifications</option>
              {CERTIFICATIONS.map((cert) => (
                <option key={cert} value={cert}>{cert}</option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div>
            <label htmlFor="filter-category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="filter-category"
              className="mt-1 block w-full min-h-[44px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={filters.category ?? ''}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Availability filter */}
          <div>
            <label htmlFor="filter-availability" className="block text-sm font-medium text-gray-700">
              Availability
            </label>
            <select
              id="filter-availability"
              className="mt-1 block w-full min-h-[44px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={filters.availability ?? ''}
              onChange={(e) => handleFilterChange('availability', e.target.value)}
            >
              <option value="">All Availability</option>
              {AVAILABILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Revenue model filter */}
          <div>
            <label htmlFor="filter-revenue-model" className="block text-sm font-medium text-gray-700">
              Revenue Model
            </label>
            <select
              id="filter-revenue-model"
              className="mt-1 block w-full min-h-[44px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={filters.revenue_model ?? ''}
              onChange={(e) => handleFilterChange('revenue_model', e.target.value)}
            >
              <option value="">All Models</option>
              <option value="broker">Broker</option>
              <option value="wholesale">Wholesale</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          <SkeletonLoader variant="card" className="h-16" />
          <SkeletonLoader variant="card" className="h-16" />
          <SkeletonLoader variant="card" className="h-16" />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <EmptyState
          title="Error loading products"
          description="An error occurred while loading the product catalog. Please try again."
        />
      )}

      {/* Empty state */}
      {!isLoading && !isError && products.length === 0 && (
        <EmptyState
          title="No products found"
          description="No products match your current filters. Try adjusting your search criteria."
        />
      )}

      {/* Product table */}
      {!isLoading && !isError && products.length > 0 && (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Product</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">SKU</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Brand</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Price</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Certifications</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => {
                  const badge = getAvailabilityBadge(product.availability_status);
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{product.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{product.sku}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{product.brand?.name ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{product.category}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                        ${Number(product.unit_price).toFixed(2)}
                        {product.promo_active && product.promo_price !== null && (
                          <span className="ml-1 text-xs text-green-600">(Promo: ${Number(product.promo_price).toFixed(2)})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {product.certifications.map((cert) => (
                            <span key={cert} className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                              {cert}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <Link
                            href={`/products/${product.id}`}
                            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label={`View ${product.name}`}
                          >
                            View
                          </Link>
                          {product.brand && (
                            <button
                              type="button"
                              onClick={() => generateLineCard(product.brand!.id)}
                              disabled={isGenerating}
                              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded text-purple-600 hover:text-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                              aria-label={`Generate line card for ${product.brand.name}`}
                            >
                              Line Card
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Showing page {pagination.page} of {pagination.total_pages} ({pagination.total_count} products)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="min-h-[44px] rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.total_pages}
                  className="min-h-[44px] rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
