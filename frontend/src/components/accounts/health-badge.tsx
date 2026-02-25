'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

type HealthBadgeVariant = 'compact' | 'expanded';

interface HealthBadgeProps {
  score: number | null;
  lastCalculatedAt?: string | null;
  variant?: HealthBadgeVariant;
  className?: string;
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function getScoreColor(score: number): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  if (score >= 67) {
    return {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      dot: 'bg-green-500',
    };
  }
  if (score >= 34) {
    return {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      dot: 'bg-yellow-500',
    };
  }
  return {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
  };
}

function getScoreLabel(score: number): string {
  if (score >= 80) {
    return 'Excellent';
  }
  if (score >= 67) {
    return 'Good';
  }
  if (score >= 34) {
    return 'Fair';
  }
  return 'Poor';
}

function formatLastCalculated(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    return 'Less than an hour ago';
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function HealthBadge({
  score,
  lastCalculatedAt,
  variant = 'compact',
  className,
}: HealthBadgeProps): React.JSX.Element {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const openTooltip = useCallback((): void => {
    setShowTooltip(true);
  }, []);

  const closeTooltip = useCallback((): void => {
    setShowTooltip(false);
  }, []);

  // Close tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        tooltipRef.current &&
        triggerRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setShowTooltip(false);
      }
    }

    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTooltip]);

  // Null score state
  if (score === null) {
    return (
      <span
        className={clsx(
          'inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500',
          className,
        )}
        data-testid="health-badge-null"
      >
        Not calculated
      </span>
    );
  }

  const colors = getScoreColor(score);
  const label = getScoreLabel(score);

  if (variant === 'compact') {
    return (
      <div className={clsx('relative inline-flex', className)} ref={triggerRef}>
        <button
          type="button"
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
            colors.bg,
            colors.text,
            colors.border,
          )}
          onMouseEnter={openTooltip}
          onMouseLeave={closeTooltip}
          onFocus={openTooltip}
          onBlur={closeTooltip}
          aria-label={`Health score: ${score} - ${label}`}
        >
          <span className={clsx('h-1.5 w-1.5 rounded-full', colors.dot)} aria-hidden="true" />
          {score}
        </button>

        {showTooltip ? (
          <div
            ref={tooltipRef}
            role="tooltip"
            className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-lg"
          >
            <p className="font-medium">{label} ({score}/100)</p>
            {lastCalculatedAt ? (
              <p className="mt-0.5 text-gray-300">
                Last calculated: {formatLastCalculated(lastCalculatedAt)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  // Expanded variant
  return (
    <div
      className={clsx('rounded-lg border p-4', colors.bg, colors.border, className)}
      data-testid="health-badge-expanded"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Health Score</span>
        <span className={clsx('text-2xl font-bold', colors.text)}>{score}</span>
      </div>
      <div className="mt-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
          <div
            className={clsx('h-full rounded-full transition-all', colors.dot)}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className={clsx('text-sm font-medium', colors.text)}>{label}</span>
        {lastCalculatedAt ? (
          <span className="text-xs text-gray-500">
            Last calculated: {formatLastCalculated(lastCalculatedAt)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
