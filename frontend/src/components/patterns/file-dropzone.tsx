'use client';

import * as React from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileDropzoneProps {
  onFileDrop: (files: File[]) => void;
  acceptedTypes?: string[];
  maxSizeBytes?: number;
  label?: string;
  className?: string;
}

function FileDropzone({
  onFileDrop,
  acceptedTypes,
  maxSizeBytes = 50 * 1024 * 1024,
  label = 'Drag and drop files here, or click to browse',
  className,
}: FileDropzoneProps): React.ReactElement {
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function validateFiles(files: File[]): File[] {
    const valid: File[] = [];
    for (const file of files) {
      if (maxSizeBytes && file.size > maxSizeBytes) {
        const sizeMB = Math.round(maxSizeBytes / (1024 * 1024));
        setError(`File "${file.name}" exceeds the ${sizeMB}MB limit`);
        return [];
      }
      if (acceptedTypes && acceptedTypes.length > 0) {
        const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
        const typeMatch = acceptedTypes.some((t) => t === file.type || t === ext);
        if (!typeMatch) {
          setError(`File "${file.name}" is not an accepted type`);
          return [];
        }
      }
      valid.push(file);
    }
    return valid;
  }

  function handleDrop(e: React.DragEvent): void {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    const files = Array.from(e.dataTransfer.files);
    const valid = validateFiles(files);
    if (valid.length > 0) {
      onFileDrop(valid);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setError(null);
    const files = Array.from(e.target.files ?? []);
    const valid = validateFiles(files);
    if (valid.length > 0) {
      onFileDrop(valid);
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <button
        type="button"
        className={cn(
          'flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-body text-muted-foreground">{label}</p>
        {acceptedTypes && (
          <p className="mt-1 text-small text-muted-foreground">Accepted: {acceptedTypes.join(', ')}</p>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={acceptedTypes?.join(',')}
        onChange={handleChange}
        multiple
      />
      {error && (
        <p className="text-small text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export { FileDropzone };
