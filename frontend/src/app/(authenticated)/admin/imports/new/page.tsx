'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/patterns/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileDropzone } from '@/components/patterns/file-dropzone';
import { useUploadImport, useConfirmImport } from '@/hooks/use-imports';
import type { ImportEntityType, ImportUploadResponse, ImportError } from '@/hooks/use-imports';
import { toast } from 'sonner';
import { CheckCircle, AlertTriangle, Upload, ArrowRight, ArrowLeft } from 'lucide-react';

type WizardStep = 'entity' | 'upload' | 'preview' | 'confirm';

const ENTITY_TYPES: { value: ImportEntityType; label: string }[] = [
  { value: 'account', label: 'Accounts' },
  { value: 'contact', label: 'Contacts' },
  { value: 'product', label: 'Products' },
  { value: 'order', label: 'Orders' },
];

const STEPS: { key: WizardStep; label: string; number: number }[] = [
  { key: 'entity', label: 'Select Type', number: 1 },
  { key: 'upload', label: 'Upload File', number: 2 },
  { key: 'preview', label: 'Preview', number: 3 },
  { key: 'confirm', label: 'Confirm', number: 4 },
];

function StepIndicator({ currentStep }: { currentStep: WizardStep }): React.ReactElement {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((step, i) => (
        <React.Fragment key={step.key}>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              i <= currentIndex
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {step.number}
          </div>
          <span
            className={`text-sm ${
              i <= currentIndex ? 'font-medium' : 'text-muted-foreground'
            }`}
          >
            {step.label}
          </span>
          {i < STEPS.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
        </React.Fragment>
      ))}
    </div>
  );
}

function ErrorTable({ errors }: { errors: ImportError[] }): React.ReactElement {
  return (
    <div className="max-h-64 overflow-y-auto rounded border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted">
          <tr>
            <th className="p-2 text-left">Row</th>
            <th className="p-2 text-left">Field</th>
            <th className="p-2 text-left">Error</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((err, i) => (
            <tr key={i} className="border-t bg-red-50">
              <td className="p-2">{err.row}</td>
              <td className="p-2 font-mono text-xs">{err.field}</td>
              <td className="p-2">{err.error}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ImportWizardPage(): React.ReactElement {
  const router = useRouter();
  const uploadImport = useUploadImport();
  const confirmImport = useConfirmImport();

  const [step, setStep] = React.useState<WizardStep>('entity');
  const [entityType, setEntityType] = React.useState<ImportEntityType>('account');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [uploadResult, setUploadResult] = React.useState<ImportUploadResponse['data'] | null>(null);
  const [importComplete, setImportComplete] = React.useState(false);

  function handleFileSelect(files: File[]): void {
    const file = files[0];
    if (file) {
      setSelectedFile(file);
    }
  }

  function handleUpload(): void {
    if (!selectedFile) return;
    uploadImport.mutate(
      { file: selectedFile, entityType },
      {
        onSuccess: (response) => {
          setUploadResult(response.data);
          setStep('preview');
        },
        onError: () => {
          toast.error('Failed to upload file');
        },
      },
    );
  }

  function handleConfirm(): void {
    if (!uploadResult) return;
    confirmImport.mutate(
      { importId: uploadResult.id, skipErrors: true },
      {
        onSuccess: () => {
          setImportComplete(true);
          setStep('confirm');
          toast.success('Import started successfully');
        },
        onError: () => {
          toast.error('Failed to start import');
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Data"
        breadcrumbs={[
          { label: 'Data Imports', href: '/admin/imports' },
          { label: 'New Import' },
        ]}
      />

      <StepIndicator currentStep={step} />

      {/* Step 1: Select Entity Type */}
      {step === 'entity' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Entity Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="entity-type">What type of data are you importing?</Label>
              <Select
                id="entity-type"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as ImportEntityType)}
              >
                {ENTITY_TYPES.map((et) => (
                  <option key={et.value} value={et.value}>
                    {et.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep('upload')}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Upload File */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileDropzone
              onFileDrop={handleFileSelect}
              acceptedTypes={['.csv', '.xlsx', '.xls']}
              maxSizeBytes={50 * 1024 * 1024}
              label="Drag and drop a CSV or Excel file here, or click to browse"
            />
            {selectedFile && (
              <div className="flex items-center gap-2 text-sm">
                <Upload className="h-4 w-4" />
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-muted-foreground">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('entity')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadImport.isPending}
              >
                {uploadImport.isPending ? 'Uploading...' : 'Upload & Preview'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded bg-muted p-4">
                <div className="text-2xl font-bold">{uploadResult.totalRows}</div>
                <div className="text-sm text-muted-foreground">Total Rows</div>
              </div>
              <div className="rounded bg-green-50 p-4">
                <div className="text-2xl font-bold text-green-600">{uploadResult.validRows}</div>
                <div className="text-sm text-muted-foreground">Valid</div>
              </div>
              <div className="rounded bg-red-50 p-4">
                <div className="text-2xl font-bold text-red-600">{uploadResult.errorRows}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>

            <p className="text-sm">
              {uploadResult.totalRows} rows parsed, {uploadResult.validRows} valid,{' '}
              {uploadResult.errorRows} errors
            </p>

            {uploadResult.warnings.length > 0 && (
              <div className="space-y-1">
                {uploadResult.warnings.map((w, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    {w}
                  </div>
                ))}
              </div>
            )}

            {uploadResult.errors.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium">Error Details</h4>
                <ErrorTable errors={uploadResult.errors} />
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={confirmImport.isPending || uploadResult.validRows === 0}
              >
                {confirmImport.isPending ? 'Starting...' : 'Import Valid Rows'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {step === 'confirm' && importComplete && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <h3 className="text-lg font-medium">Import Started</h3>
            <p className="text-sm text-muted-foreground">
              Your import is being processed. You can check the status on the imports page.
            </p>
            {uploadResult && (
              <div className="flex gap-2">
                <Badge variant="secondary">{uploadResult.validRows} rows queued</Badge>
                {uploadResult.errorRows > 0 && (
                  <Badge className="bg-red-100 text-red-700">
                    {uploadResult.errorRows} errors skipped
                  </Badge>
                )}
              </div>
            )}
            <Button onClick={() => router.push('/admin/imports')}>
              View Import History
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading overlay during upload */}
      {uploadImport.isPending && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
