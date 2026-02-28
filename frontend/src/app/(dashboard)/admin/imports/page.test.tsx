import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import DataImportPage from './page';

vi.mock('@/hooks/use-imports', () => ({
  useValidateImport: vi.fn(),
  useExecuteImport: vi.fn(),
}));

vi.mock('@/components/imports/file-dropzone', () => ({
  FileDropzone: ({ onFileSelect }: { onFileSelect: unknown }) => (
    <div data-testid="file-dropzone" data-has-handler={typeof onFileSelect === 'function'} />
  ),
}));

vi.mock('@/components/imports/import-preview', () => ({
  ImportPreview: () => <div data-testid="import-preview" />,
}));

vi.mock('@/components/imports/import-summary', () => ({
  ImportSummary: () => <div data-testid="import-summary" />,
}));

import { useValidateImport, useExecuteImport } from '@/hooks/use-imports';

const mockUseValidateImport = vi.mocked(useValidateImport);
const mockUseExecuteImport = vi.mocked(useExecuteImport);

const makeMutation = (overrides = {}) => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isPending: false,
  error: null,
  data: null,
  reset: vi.fn(),
  isIdle: true,
  isSuccess: false,
  isError: false,
  status: 'idle' as const,
  variables: undefined,
  failureCount: 0,
  failureReason: null,
  context: undefined,
  submittedAt: 0,
  isPaused: false,
  ...overrides,
});

describe('DataImportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-P015: renders "Data Import" heading with entity type selector', () => {
    mockUseValidateImport.mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof useValidateImport>,
    );
    mockUseExecuteImport.mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof useExecuteImport>,
    );

    render(<DataImportPage />);

    expect(screen.getByText('Data Import')).toBeInTheDocument();
    expect(screen.getByLabelText('Entity Type')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Accounts')).toBeInTheDocument();
  });

  it('FR-P015: entity type selector contains all options', () => {
    mockUseValidateImport.mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof useValidateImport>,
    );
    mockUseExecuteImport.mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof useExecuteImport>,
    );

    render(<DataImportPage />);

    const select = screen.getByLabelText('Entity Type');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Accounts')).toBeInTheDocument();
    expect(screen.getByText('Contacts')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
  });

  it('FR-P015: shows error banner when executeImport has error', () => {
    mockUseValidateImport.mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof useValidateImport>,
    );
    mockUseExecuteImport.mockReturnValue(
      makeMutation({ error: new Error('import fail') }) as unknown as ReturnType<
        typeof useExecuteImport
      >,
    );

    render(<DataImportPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Import failed')).toBeInTheDocument();
  });

  it('FR-P015: does not show error banner when no error', () => {
    mockUseValidateImport.mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof useValidateImport>,
    );
    mockUseExecuteImport.mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof useExecuteImport>,
    );

    render(<DataImportPage />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('FR-P015: renders FileDropzone component', () => {
    mockUseValidateImport.mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof useValidateImport>,
    );
    mockUseExecuteImport.mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof useExecuteImport>,
    );

    render(<DataImportPage />);

    const dropzone = screen.getByTestId('file-dropzone');
    expect(dropzone).toBeInTheDocument();
    expect(dropzone).toHaveAttribute('data-has-handler', 'true');
  });

  it('FR-P015: renders ImportPreview when validation data exists', () => {
    const validationData = {
      totalRows: 10,
      validRows: 8,
      errorRows: 2,
      errors: [],
      unmappedColumns: [],
    };
    mockUseValidateImport.mockReturnValue(
      makeMutation({ data: validationData }) as unknown as ReturnType<typeof useValidateImport>,
    );
    mockUseExecuteImport.mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof useExecuteImport>,
    );

    render(<DataImportPage />);

    expect(screen.getByTestId('import-preview')).toBeInTheDocument();
  });

  it('FR-P015: renders ImportSummary when executeImport data exists', () => {
    mockUseValidateImport.mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof useValidateImport>,
    );
    mockUseExecuteImport.mockReturnValue(
      makeMutation({
        data: { created: 5, updated: 3, skipped: 2, errors: [] },
      }) as unknown as ReturnType<typeof useExecuteImport>,
    );

    render(<DataImportPage />);

    expect(screen.getByTestId('import-summary')).toBeInTheDocument();
  });
});
