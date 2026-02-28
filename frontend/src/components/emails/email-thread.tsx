'use client';

import { EmailStatusIcon } from './email-status-icon';

import type { EmailRecord } from '@/hooks/use-emails';


interface EmailThreadProps {
  emails: EmailRecord[];
  onComposeClick?: () => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function EmailThread({ emails, onComposeClick }: EmailThreadProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Emails</h3>
        {onComposeClick && (
          <button
            type="button"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            onClick={onComposeClick}
          >
            Compose
          </button>
        )}
      </div>
      <div className="divide-y divide-gray-100">
        {emails.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">No emails</div>
        ) : (
          emails.map((email) => (
            <div key={email.id} className="px-4 py-3">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      email.direction === 'outbound'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {email.direction === 'outbound' ? 'Sent' : 'Received'}
                  </span>
                  <EmailStatusIcon status={email.engagementStatus} />
                </div>
                <span className="text-xs text-gray-400">{formatDate(email.createdAt)}</span>
              </div>
              <p className="text-sm font-medium text-gray-900">{email.subject ?? '(No subject)'}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {email.direction === 'outbound' ? 'To: ' : 'From: '}
                {email.direction === 'outbound' ? email.toAddresses.join(', ') : email.fromAddress}
              </p>
              {email.bodyPreview && (
                <p className="mt-1 truncate text-xs text-gray-400">{email.bodyPreview}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
