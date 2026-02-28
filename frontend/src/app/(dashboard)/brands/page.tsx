'use client';

import { useState } from 'react';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { Skeleton } from '@/components/shared/skeleton';
import { useBrands, type Brand } from '@/hooks/use-products';

export default function BrandsPage() {
  const { data: brandData, isLoading, error, refetch } = useBrands();
  const [search, setSearch] = useState('');

  if (error) {
    return <ErrorBanner message="Unable to load brands" onRetry={() => refetch()} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const brands = brandData?.data ?? [];
  const filtered = brands.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()));

  if (brands.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
        <EmptyState title="No brands" description="No brands have been added yet" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
      </div>

      <input
        type="text"
        placeholder="Search brands..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((brand) => (
          <BrandCard key={brand.id} brand={brand} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-500">No brands match your search</p>
      )}
    </div>
  );
}

function BrandCard({ brand }: { brand: Brand }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">{brand.name}</h3>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            brand.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {brand.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      {brand.description && (
        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{brand.description}</p>
      )}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span>Model: {brand.defaultRevenueModel}</span>
        <span>Commission: {brand.baseCommissionRate}%</span>
        {brand._count?.products !== undefined && <span>{brand._count.products} products</span>}
      </div>
    </div>
  );
}
