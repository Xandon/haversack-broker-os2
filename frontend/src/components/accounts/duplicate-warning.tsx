'use client';

import type { DuplicateMatch } from '@/hooks/use-accounts';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface DuplicateWarningProps {
  duplicates: DuplicateMatch[];
  onViewExisting: (id: string) => void;
  onCreateAnyway: () => void;
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function getConfidenceColor(confidence: number): {
  bar: string;
  text: string;
  bg: string;
} {
  if (confidence >= 90) {
    return { bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' };
  }
  if (confidence >= 70) {
    return { bar: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50' };
  }
  return { bar: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-50' };
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 90) {
    return 'High match';
  }
  if (confidence >= 70) {
    return 'Moderate match';
  }
  return 'Low match';
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function DuplicateWarning({
  duplicates,
  onViewExisting,
  onCreateAnyway,
}: DuplicateWarningProps): React.JSX.Element | null {
  if (duplicates.length === 0) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-label="Potential duplicate accounts found"
      className="rounded-lg border border-yellow-300 bg-yellow-50 p-4"
    >
      <div className="flex items-start gap-3">
        <svg
          className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-yellow-800">
            Potential duplicate accounts found
          </h3>
          <p className="mt-1 text-sm text-yellow-700">
            {duplicates.length === 1
              ? 'An existing account matches your entry. Review the match below.'
              : `${duplicates.length} existing accounts match your entry. Review the matches below.`}
          </p>

          <ul className="mt-3 space-y-3" aria-label="Duplicate matches">
            {duplicates.map((match) => {
              const colors = getConfidenceColor(match.confidence);
              const label = getConfidenceLabel(match.confidence);

              return (
                <li
                  key={match.id}
                  className={`rounded-md border p-3 ${colors.bg} border-opacity-50`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{match.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <div
                          className="h-2 w-16 overflow-hidden rounded-full bg-gray-200"
                          aria-hidden="true"
                        >
                          <div
                            className={`h-full rounded-full ${colors.bar}`}
                            style={{ width: `${match.confidence}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${colors.text}`}>
                          {match.confidence}% — {label}
                        </span>
                      </div>
                      {match.matchedFields.length > 0 ? (
                        <p className="mt-1 text-xs text-gray-500">
                          Matched on: {match.matchedFields.join(', ')}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => onViewExisting(match.id)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      aria-label={`View existing account: ${match.name}`}
                    >
                      View Existing
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-4">
            <button
              type="button"
              onClick={onCreateAnyway}
              className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            >
              Create Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
