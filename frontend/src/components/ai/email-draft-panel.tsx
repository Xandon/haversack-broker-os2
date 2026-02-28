'use client';

import { useState } from 'react';

import { AiGeneratedBadge } from './ai-generated-badge';

import type { EmailDraft } from '@/hooks/use-ai';

interface EmailDraftPanelProps {
  draft: EmailDraft | null;
  isLoading: boolean;
  error: Error | null;
  onGenerate: (purpose: string) => void;
}

export function EmailDraftPanel({ draft, isLoading, error, onGenerate }: EmailDraftPanelProps) {
  const [purpose, setPurpose] = useState('');

  const handleGenerate = () => {
    if (purpose.trim()) {
      onGenerate(purpose.trim());
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Email Draft</h3>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Email purpose (e.g., Follow up on Q2 catalog)"
            className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm"
            aria-label="Email purpose"
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading || !purpose.trim()}
            className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? 'Generating...' : 'Generate Draft'}
          </button>
        </div>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            AI service temporarily unavailable — please try again in a few minutes
          </div>
        )}

        {draft && !isLoading && (
          <div className="space-y-2">
            <AiGeneratedBadge />
            <div>
              <label className="text-xs font-medium text-gray-500">Subject</label>
              <input
                type="text"
                defaultValue={draft.subject}
                className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
                aria-label="Email subject"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Body</label>
              <textarea
                defaultValue={draft.body}
                className="w-full rounded border border-gray-200 p-2 text-sm"
                rows={8}
                aria-label="Email body"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
