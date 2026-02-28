'use client';

import { useCallback, useState } from 'react';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  maxSizeMb?: number;
}

export function FileDropzone({ onFileSelect, maxSizeMb = 50 }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSelect = useCallback(
    (file: File) => {
      setError(null);
      const maxBytes = maxSizeMb * 1024 * 1024;
      if (file.size > maxBytes) {
        setError(`File exceeds ${maxSizeMb} MB limit`);
        return;
      }
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'csv' && ext !== 'xlsx') {
        setError('Only CSV and XLSX files are supported');
        return;
      }
      onFileSelect(file);
    },
    [maxSizeMb, onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
        error
          ? 'border-red-400 bg-red-50'
          : isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 bg-gray-50'
      }`}
    >
      <div className="mb-2 text-3xl text-gray-400" aria-hidden="true">
        &#8682;
      </div>
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <p className="text-sm text-gray-500">Drag CSV or XLSX here, or click to browse</p>
      )}
      <input
        type="file"
        accept=".csv,.xlsx"
        onChange={handleChange}
        className="mt-3 text-sm"
        aria-label="Upload file"
      />
    </div>
  );
}
