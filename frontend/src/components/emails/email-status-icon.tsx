'use client';

import type { EngagementStatus } from '@/hooks/use-emails';

interface EmailStatusIconProps {
  status: EngagementStatus;
}

const statusConfig: Record<EngagementStatus, { label: string; color: string; icon: string }> = {
  sent: { label: 'Sent', color: 'text-gray-500', icon: '→' },
  delivered: { label: 'Delivered', color: 'text-blue-500', icon: '✓' },
  opened: { label: 'Opened', color: 'text-green-500', icon: '👁' },
  clicked: { label: 'Clicked', color: 'text-purple-500', icon: '🔗' },
  bounced: { label: 'Bounced', color: 'text-red-500', icon: '✕' },
  unsubscribed: { label: 'Unsubscribed', color: 'text-orange-500', icon: '⊘' },
};

export function EmailStatusIcon({ status }: EmailStatusIconProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${config.color}`}
      title={config.label}
    >
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  );
}
