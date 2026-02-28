'use client';

import type { ImportResult } from '@/hooks/use-imports';

interface ImportSummaryProps {
  result: ImportResult;
}

export function ImportSummary({ result }: ImportSummaryProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Import Complete</h3>
      </div>
      <div className="p-4">
        <div className="mb-4 grid grid-cols-3 gap-4 text-center">
          <div className="rounded bg-green-50 p-3">
            <div className="text-2xl font-bold text-green-700">{result.created}</div>
            <div className="text-xs text-green-600">Created</div>
          </div>
          <div className="rounded bg-blue-50 p-3">
            <div className="text-2xl font-bold text-blue-700">{result.updated}</div>
            <div className="text-xs text-blue-600">Updated</div>
          </div>
          <div className="rounded bg-gray-50 p-3">
            <div className="text-2xl font-bold text-gray-700">{result.skipped}</div>
            <div className="text-xs text-gray-500">Skipped</div>
          </div>
        </div>

        {result.errors.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase text-gray-500">
              Error Log ({result.errors.length} errors)
            </h4>
            <div className="max-h-48 overflow-y-auto rounded border border-gray-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="px-2 py-1">Row</th>
                    <th className="px-2 py-1">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((err, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-2 py-1">{err.row}</td>
                      <td className="px-2 py-1">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
