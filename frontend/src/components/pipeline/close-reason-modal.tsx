'use client';

import { useState } from 'react';

interface CloseReasonModalProps {
  isOpen: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function CloseReasonModal({ isOpen, onConfirm, onCancel }: CloseReasonModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim()) {
      onConfirm(reason.trim());
      setReason('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Mark as Closed Won"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Mark as Closed Won</h2>
        <p className="mt-1 text-sm text-gray-500">
          Please provide a reason for closing this opportunity as won.
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
            placeholder="e.g., Customer signed contract, verbal agreement..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-label="Close reason"
            autoFocus
          />

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              disabled={!reason.trim()}
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
