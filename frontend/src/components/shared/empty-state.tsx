'use client';

import type { ReactNode } from 'react';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function EmptyState({ title, description, icon, action }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      {icon ? (
        <div className="mb-4 text-gray-400">{icon}</div>
      ) : (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg
            className="h-8 w-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
