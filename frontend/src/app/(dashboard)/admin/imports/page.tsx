'use client';

import { useState } from 'react';

import { FileDropzone } from '@/components/imports/file-dropzone';
import { ImportPreview } from '@/components/imports/import-preview';
import { ImportSummary } from '@/components/imports/import-summary';
import { ErrorBanner } from '@/components/shared/error-banner';
import { type ImportEntityType, useValidateImport, useExecuteImport } from '@/hooks/use-imports';

export default function DataImportPage() {
  const [entityType, setEntityType] = useState<ImportEntityType>('account');
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);

  const validateImport = useValidateImport();
  const executeImport = useExecuteImport();

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    // Parse CSV client-side (basic parsing for demo — production would use a library)
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result ?? '') as string;
      const lines = text.split('\n').filter((l) => l.trim());
      const headerLine = lines[0];
      if (lines.length < 2 || !headerLine) return;
      const headers = headerLine.split(',').map((h) => h.trim());
      const parsedRows = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h] = values[i] ?? '';
        });
        return row;
      });
      setRows(parsedRows);
      validateImport.mutate({ entityType, rows: parsedRows });
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = () => {
    executeImport.mutate({ entityType, rows });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Data Import</h1>

      {executeImport.error && (
        <ErrorBanner message="Import failed" onRetry={() => executeImport.reset()} />
      )}

      <div>
        <label htmlFor="entity-type" className="block text-sm font-medium text-gray-700">
          Entity Type
        </label>
        <select
          id="entity-type"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value as ImportEntityType)}
          className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="account">Accounts</option>
          <option value="contact">Contacts</option>
          <option value="product">Products</option>
          <option value="order">Orders</option>
        </select>
      </div>

      <FileDropzone onFileSelect={handleFileSelect} />

      {file && <p className="text-sm text-gray-500">Selected: {file.name}</p>}

      {validateImport.data && (
        <ImportPreview
          preview={validateImport.data}
          onImport={handleImport}
          isImporting={executeImport.isPending}
        />
      )}

      {executeImport.data && <ImportSummary result={executeImport.data} />}
    </div>
  );
}
