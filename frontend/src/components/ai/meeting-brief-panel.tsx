'use client';

import { AiGeneratedBadge } from './ai-generated-badge';

import type { MeetingBrief } from '@/hooks/use-ai';

interface MeetingBriefPanelProps {
  brief: MeetingBrief | null;
  isLoading: boolean;
  error: Error | null;
  onGenerate: () => void;
  onEdit?: (field: string, value: string) => void;
}

export function MeetingBriefPanel({ brief, isLoading, error, onGenerate }: MeetingBriefPanelProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Meeting Brief</h3>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading}
          className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isLoading ? 'Generating...' : 'Prepare Meeting Brief'}
        </button>
      </div>

      <div className="p-4">
        {error && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            AI service temporarily unavailable — please try again in a few minutes
          </div>
        )}

        {isLoading && (
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-4 w-1/2 rounded bg-gray-200" />
            <div className="h-4 w-2/3 rounded bg-gray-200" />
          </div>
        )}

        {brief && !isLoading && (
          <div className="space-y-4">
            <AiGeneratedBadge />

            {brief.keyContacts.length > 0 && (
              <div>
                <h4 className="mb-1 text-xs font-medium uppercase text-gray-500">Key Contacts</h4>
                <ul className="space-y-1 text-sm">
                  {brief.keyContacts.map((contact, i) => (
                    <li key={i}>
                      <span className="font-medium">{contact.name}</span>
                      {contact.title && <span className="text-gray-500"> — {contact.title}</span>}
                      {contact.notes && <span className="text-gray-400"> ({contact.notes})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h4 className="mb-1 text-xs font-medium uppercase text-gray-500">Recent Activity</h4>
              <textarea
                defaultValue={brief.recentActivitySummary}
                className="w-full rounded border border-gray-200 p-2 text-sm"
                rows={3}
                aria-label="Activity summary"
              />
            </div>

            <div>
              <h4 className="mb-1 text-xs font-medium uppercase text-gray-500">Order Trends</h4>
              <textarea
                defaultValue={brief.orderTrends}
                className="w-full rounded border border-gray-200 p-2 text-sm"
                rows={2}
                aria-label="Order trends"
              />
            </div>

            {brief.suggestedTalkingPoints.length > 0 && (
              <div>
                <h4 className="mb-1 text-xs font-medium uppercase text-gray-500">
                  Suggested Talking Points
                </h4>
                <ul className="list-disc space-y-1 pl-4 text-sm">
                  {brief.suggestedTalkingPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!brief && !isLoading && !error && (
          <p className="text-sm text-gray-400">
            Click &quot;Prepare Meeting Brief&quot; to generate an AI-powered brief for this
            account.
          </p>
        )}
      </div>
    </div>
  );
}
