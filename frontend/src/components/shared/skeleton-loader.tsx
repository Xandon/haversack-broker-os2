'use client';

import { clsx } from 'clsx';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

type SkeletonVariant = 'text' | 'card' | 'table-row' | 'avatar';

interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
  className?: string;
  count?: number;
}

// -------------------------------------------------------------------
// Variant base classes
// -------------------------------------------------------------------

const VARIANT_CLASSES: Record<SkeletonVariant, string> = {
  text: 'h-4 w-full rounded',
  card: 'h-32 w-full rounded-lg',
  'table-row': 'h-12 w-full rounded',
  avatar: 'h-10 w-10 rounded-full',
};

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function SkeletonLoader({
  variant = 'text',
  className,
  count = 1,
}: SkeletonLoaderProps): React.JSX.Element {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading">
      {items.map((i) => (
        <div
          key={i}
          className={clsx('animate-pulse bg-gray-200', VARIANT_CLASSES[variant], className)}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
