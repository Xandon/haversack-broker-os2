'use client';

import type { ImportPreview as ImportPreviewData } from '@/hooks/use-imports';

interface ImportPreviewProps {
  preview: ImportPreviewData;
  onImport: () => void;
  isImporting: boolean;
}

export function ImportPreview({ preview, onImport, isImporting }: ImportPreviewProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Import Preview</h3>
      </div>
      <div className="p-4">
        <div className="mb-4 grid grid-cols-3 gap-4 text-center">
          <div className="rounded bg-gray-50 p-3">
            <div className="text-2xl font-bold text-gray-900">{preview.totalRows}</div>
            <div className="text-xs text-gray-500">Total Rows</div>
          </div>
          <div className="rounded bg-green-50 p-3">
            <div className="text-2xl font-bold text-green-700">{preview.validRows}</div>
            <div className="text-xs text-green-600">Valid</div>
          </div>
          <div className="rounded bg-red-50 p-3">
            <div className="text-2xl font-bold text-red-700">{preview.errorRows}</div>
            <div className="text-xs text-red-600">Errors</div>
          </div>
        </div>

        {preview.unmappedColumns.length > 0 && (
          <div className="mb-4 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
            {preview.unmappedColumns.length} columns not recognized and will be skipped:{' '}
            {preview.unmappedColumns.join(', ')}
          </div>
        )}

        {preview.errors.length > 0 && (
          <div className="mb-4">
            <h4 className="mb-2 text-xs font-medium uppercase text-gray-500">Validation Errors</h4>
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="px-2 py-1">Row</th>
                    <th className="px-2 py-1">Field</th>
                    <th className="px-2 py-1">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.errors.map((err, i) => (
                    <tr key={i} className="border-b border-gray-100 text-red-600">
                      <td className="px-2 py-1">{err.row}</td>
                      <td className="px-2 py-1">{err.field}</td>
                      <td className="px-2 py-1">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onImport}
          disabled={preview.validRows === 0 || isImporting}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isImporting ? 'Importing...' : `Import ${preview.validRows} Valid Rows`}
        </button>
      </div>
    </div>
  );
}
