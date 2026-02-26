'use client';

/**
 * Product detail page with certifications, allergens, and availability.
 * Implements FR-019 (product catalog detail view).
 */
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { EmptyState } from '@/components/shared/empty-state';
import { SkeletonLoader } from '@/components/shared/skeleton-loader';
import { useProduct } from '@/hooks/use-products';

const AVAILABILITY_LABELS: Record<string, { label: string; color: string }> = {
  in_stock: { label: 'In Stock', color: 'bg-green-100 text-green-800' },
  limited: { label: 'Limited', color: 'bg-yellow-100 text-yellow-800' },
  out_of_stock: { label: 'Out of Stock', color: 'bg-red-100 text-red-800' },
  discontinued: { label: 'Discontinued', color: 'bg-gray-100 text-gray-800' },
};

export default function ProductDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const productId = params.id ?? '';
  const { product, isLoading, isError, error } = useProduct(productId);

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <SkeletonLoader variant="text" className="h-4 w-48" />
        </div>
        <div className="mb-6">
          <SkeletonLoader variant="text" className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <SkeletonLoader variant="card" className="h-64" />
          </div>
          <div className="space-y-6">
            <SkeletonLoader variant="card" className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    const is404 = error?.message?.includes('404') || error?.message?.includes('not found');
    return (
      <div>
        <div className="mb-6">
          <Link
            href="/products"
            className="inline-flex min-h-[44px] items-center gap-1 rounded text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Back to products list"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Products
          </Link>
        </div>
        <EmptyState
          title={is404 ? 'Product not found' : 'Error loading product'}
          description={is404 ? 'The product you are looking for does not exist.' : 'An error occurred while loading the product. Please try again.'}
        />
      </div>
    );
  }

  if (!product) {
    return (
      <div>
        <div className="mb-6">
          <Link
            href="/products"
            className="inline-flex min-h-[44px] items-center gap-1 rounded text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Back to products list"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Products
          </Link>
        </div>
        <EmptyState title="Product not found" description="The product you are looking for does not exist." />
      </div>
    );
  }

  const availability = AVAILABILITY_LABELS[product.availability_status] ?? { label: product.availability_status, color: 'bg-gray-100 text-gray-800' };

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link href="/products" className="hover:text-gray-700 hover:underline">Products</Link>
          </li>
          <li aria-hidden="true">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </li>
          <li className="font-medium text-gray-900" aria-current="page">{product.name}</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="mt-1 text-sm text-gray-500">SKU: {product.sku}</p>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${availability.color}`}>
          {availability.label}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Product Info */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Product Information</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Brand</dt>
                <dd className="mt-1 text-sm text-gray-900">{product.brand?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="mt-1 text-sm text-gray-900">{product.category}{product.subcategory ? ` / ${product.subcategory}` : ''}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Unit Price</dt>
                <dd className="mt-1 text-sm text-gray-900">${Number(product.unit_price).toFixed(2)}</dd>
              </div>
              {product.wholesale_price !== null && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Wholesale Price</dt>
                  <dd className="mt-1 text-sm text-gray-900">${Number(product.wholesale_price).toFixed(2)}</dd>
                </div>
              )}
              {product.case_size && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Case Size</dt>
                  <dd className="mt-1 text-sm text-gray-900">{product.case_size}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Revenue Model</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{product.revenue_model}</dd>
              </div>
            </dl>

            {product.description && (
              <div className="mt-4">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">{product.description}</dd>
              </div>
            )}
          </div>

          {/* Promo Info */}
          {product.promo_active && product.promo_price !== null && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-6">
              <h2 className="mb-2 text-lg font-semibold text-green-800">Active Promotion</h2>
              <p className="text-sm text-green-700">
                Promo Price: <span className="font-bold">${Number(product.promo_price).toFixed(2)}</span>
                {product.promo_end_date && (
                  <span className="ml-2">
                    (Ends: {new Date(product.promo_end_date).toLocaleDateString()})
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Certifications */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Certifications</h2>
            {product.certifications.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {product.certifications.map((cert) => (
                  <span key={cert} className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                    {cert}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No certifications</p>
            )}
          </div>

          {/* Allergens */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Allergens (Big 9)</h2>
            {product.allergens.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {product.allergens.map((allergen) => (
                  <span key={allergen} className="inline-flex rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                    {allergen}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No known allergens</p>
            )}
          </div>

          {/* Dietary Attributes */}
          {product.dietary_attributes.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Dietary</h2>
              <div className="flex flex-wrap gap-2">
                {product.dietary_attributes.map((attr) => (
                  <span key={attr} className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                    {attr}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
