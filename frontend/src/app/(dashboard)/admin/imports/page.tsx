'use client';

import { useCallback, useRef, useState } from 'react';
import { clsx } from 'clsx';

import {
  useImports,
  useUploadImport,
  useExecuteImport,
  type ImportEntityType,
  type ImportJobStatus,
} from '@/hooks/use-imports';
import { SkeletonLoader } from '@/components/shared/skeleton-loader';
import { EmptyState } from '@/components/shared/empty-state';

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ENTITY_TYPE_OPTIONS: Array<{ value: ImportEntityType; label: string }> = [
  { value: 'account', label: 'Accounts' },
  { value: 'contact', label: 'Contacts' },
  { value: 'product', label: 'Products' },
  { value: 'order', label: 'Orders' },
];

function getStatusBadgeClasses(status: ImportJobStatus): string {
  switch (status) {
    case 'uploaded':
    case 'validating':
      return 'bg-yellow-100 text-yellow-700';
    case 'preview':
      return 'bg-blue-100 text-blue-700';
    case 'importing':
      return 'bg-indigo-100 text-indigo-700';
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'failed':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// -------------------------------------------------------------------
// Page Component
// -------------------------------------------------------------------

export default function AdminImportsPage(): React.JSX.Element {
  const [entityType, setEntityType] = useState<ImportEntityType>('account');
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { imports, isLoading, isError, error } = useImports();
  const { uploadImport, isLoading: isUploading } = useUploadImport();
  const { executeImport, isLoading: isExecuting } = useExecuteImport();

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setFileSizeError(null);
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileSizeError(
          `File exceeds ${MAX_FILE_SIZE_MB} MB limit (${formatFileSize(file.size)}). Please select a smaller file.`,
        );
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      uploadImport(entityType, file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [entityType, uploadImport],
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Import</h1>
        <p className="mt-1 text-sm text-gray-500">
          Import accounts, contacts, products, or orders from CSV/XLSX files (max {MAX_FILE_SIZE_MB} MB).
        </p>
      </div>

      {/* Upload section */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Upload File</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div>
            <label htmlFor="entity_type" className="block text-sm font-medium text-gray-700">
              Entity Type
            </label>
            <select
              id="entity_type"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as ImportEntityType)}
              className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {ENTITY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="file_upload" className="block text-sm font-medium text-gray-700">
              CSV or XLSX File
            </label>
            <input
              ref={fileInputRef}
              id="file_upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:min-h-[44px] file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>

        {fileSizeError ? (
          <div className="mt-3 rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-800">{fileSizeError}</p>
          </div>
        ) : null}

        {isUploading ? (
          <div className="mt-3 rounded-md bg-blue-50 p-3">
            <p className="text-sm text-blue-800">Uploading and validating file...</p>
          </div>
        ) : null}
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="mt-6">
          <SkeletonLoader variant="card" count={3} />
        </div>
      ) : null}

      {/* Error state */}
      {isError ? (
        <div className="mt-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Failed to load imports: {error?.message ?? 'Unknown error'}
          </p>
        </div>
      ) : null}

      {/* Empty state */}
      {!isLoading && !isError && imports.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No imports yet"
            description="Upload a CSV or XLSX file to get started."
          />
        </div>
      ) : null}

      {/* Import jobs list */}
      {!isLoading && !isError && imports.length > 0 ? (
        <ul className="mt-6 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm" role="list">
          {imports.map((job) => (
            <li
              key={job.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {job.file_name}
                  </span>
                  <span
                    className={clsx(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      getStatusBadgeClasses(job.status),
                    )}
                  >
                    {job.status}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {job.entity_type}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                  <span>{formatFileSize(job.file_size)}</span>
                  <span>Rows: {job.total_rows} total, {job.valid_rows} valid, {job.error_rows} errors</span>
                  {job.imported_rows != null ? (
                    <span>Imported: {job.imported_rows}</span>
                  ) : null}
                  <span>{formatDate(job.created_at)}</span>
                </div>
              </div>

              {job.status === 'preview' ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => executeImport(job.id, true)}
                    disabled={isExecuting}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Import Valid Only ({job.valid_rows})
                  </button>
                  {job.error_rows === 0 ? (
                    <button
                      type="button"
                      onClick={() => executeImport(job.id, false)}
                      disabled={isExecuting}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Import All ({job.total_rows})
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
