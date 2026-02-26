'use client';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface ApprovalBadgeProps {
  status: string;
  className?: string;
}

// -------------------------------------------------------------------
// Status color and label mappings (FR-017)
// -------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  draft: {
    label: 'Draft',
    classes: 'bg-gray-100 text-gray-700',
  },
  pending: {
    label: 'Pending',
    classes: 'bg-blue-100 text-blue-700',
  },
  pending_approval: {
    label: 'Pending Approval',
    classes: 'bg-yellow-100 text-yellow-800',
  },
  approved: {
    label: 'Approved',
    classes: 'bg-green-100 text-green-700',
  },
  confirmed: {
    label: 'Confirmed',
    classes: 'bg-green-200 text-green-800',
  },
  rejected: {
    label: 'Rejected',
    classes: 'bg-red-100 text-red-700',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-gray-200 text-gray-600',
  },
};

// -------------------------------------------------------------------
// ApprovalBadge Component (T090 — FR-017)
// -------------------------------------------------------------------

export function ApprovalBadge({ status, className = '' }: ApprovalBadgeProps): JSX.Element {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    classes: 'bg-gray-100 text-gray-600',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}
