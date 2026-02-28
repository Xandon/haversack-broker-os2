'use client';

import { useState } from 'react';

import { ProductCard } from '@/components/products/product-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { SkeletonCard } from '@/components/shared/skeleton';
import { useBrands, useProducts } from '@/hooks/use-products';

export default function ProductCatalogPage() {
  const [search, setSearch] = useState('');
  const [brandId, setBrandId] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useProducts({
    page,
    limit: 20,
    search,
    brandId: brandId || undefined,
  });
  const { data: brands } = useBrands();

  if (error) {
    return <ErrorBanner message="Unable to load products" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm md:w-64"
        />
        <select
          value={brandId}
          onChange={(e) => {
            setBrandId(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Brands</option>
          {brands?.data.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          title="No products found"
          description={search || brandId ? 'Try different filters' : 'No products in the catalog'}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {data.data.length} of {data.total} products
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={data.data.length < 20}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
