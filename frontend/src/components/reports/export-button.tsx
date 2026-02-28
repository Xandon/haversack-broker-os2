'use client';

interface ExportButtonProps {
  onExport: (format: 'csv' | 'xlsx') => void;
  isExporting: boolean;
  disabled: boolean;
}

export function ExportButton({ onExport, isExporting, disabled }: ExportButtonProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onExport('csv')}
        disabled={disabled || isExporting}
        className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {isExporting ? 'Exporting...' : 'Export CSV'}
      </button>
      <button
        type="button"
        onClick={() => onExport('xlsx')}
        disabled={disabled || isExporting}
        className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {isExporting ? 'Exporting...' : 'Export Excel'}
      </button>
    </div>
  );
}
