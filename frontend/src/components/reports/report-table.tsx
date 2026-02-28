'use client';

interface ColumnDef {
  key: string;
  label: string;
}

interface ReportTableProps {
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
  totalCount: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

function formatCellValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US').format(value);
  }
  return String(value);
}

export function ReportTable({
  columns,
  rows,
  totalCount,
  page,
  limit,
  onPageChange,
}: ReportTableProps) {
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {totalCount} {totalCount === 1 ? 'result' : 'results'}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" role="table">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-500">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-2">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-gray-100">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-2">
                    {formatCellValue(row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">No results found</p>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
