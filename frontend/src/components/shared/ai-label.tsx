'use client';

/**
 * AI label component.
 * Marks AI-generated content with a visible "AI-Generated" label.
 * Implements FR-035: all AI output labeled "AI-Generated" and editable.
 */

interface AiLabelProps {
  /** Display variant: badge (default) or inline text */
  variant?: 'badge' | 'inline';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Visual indicator for AI-generated content (FR-035).
 * Renders a purple badge or inline label reading "AI-Generated".
 */
export function AiLabel({ variant = 'badge', className = '' }: AiLabelProps): React.JSX.Element {
  if (variant === 'inline') {
    return (
      <span
        data-testid="ai-label"
        className={`text-xs font-medium text-purple-600 ${className}`.trim()}
      >
        AI-Generated
      </span>
    );
  }

  return (
    <span
      data-testid="ai-label"
      className={`inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10 ${className}`.trim()}
    >
      <svg
        className="h-3 w-3"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M8 1a.75.75 0 01.75.75v1.5a3.75 3.75 0 013 3h1.5a.75.75 0 010 1.5h-1.5a3.75 3.75 0 01-3 3v1.5a.75.75 0 01-1.5 0v-1.5a3.75 3.75 0 01-3-3H.75a.75.75 0 010-1.5h1.5a3.75 3.75 0 013-3v-1.5A.75.75 0 018 1zm0 4.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
      </svg>
      AI-Generated
    </span>
  );
}
