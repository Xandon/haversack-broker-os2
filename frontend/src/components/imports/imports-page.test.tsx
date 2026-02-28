import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ImportsPage from '@/app/(authenticated)/admin/imports/page';
import ImportWizardPage from '@/app/(authenticated)/admin/imports/new/page';

vi.mock('@/hooks/use-imports', () => ({
  useImports: vi.fn(),
  useUploadImport: vi.fn(),
  useConfirmImport: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
}));

vi.mock('@/components/patterns/file-dropzone', () => ({
  FileDropzone: ({ onFileDrop }: { onFileDrop: (files: File[]) => void }) => (
    <button
      data-testid="file-dropzone"
      onClick={() => onFileDrop([new File(['test'], 'test.csv', { type: 'text/csv' })])}
    >
      Upload
    </button>
  ),
}));

import { useImports, useUploadImport, useConfirmImport } from '@/hooks/use-imports';

const mockImports = [
  {
    id: 'imp-1',
    tenantId: 'tenant-1',
    createdBy: 'user-1',
    entityType: 'account' as const,
    filename: 'accounts.csv',
    fileSize: 24576,
    totalRows: 200,
    validRows: 195,
    errorRows: 5,
    createdRows: 195,
    updatedRows: 0,
    skippedRows: 5,
    status: 'completed' as const,
    errorLog: null,
    warnings: [],
    createdAt: '2026-02-25T00:00:00Z',
    updatedAt: '2026-02-25T00:01:00Z',
  },
  {
    id: 'imp-2',
    tenantId: 'tenant-1',
    createdBy: 'user-1',
    entityType: 'product' as const,
    filename: 'products.xlsx',
    fileSize: 512000,
    totalRows: 50,
    validRows: 50,
    errorRows: 0,
    createdRows: 0,
    updatedRows: 0,
    skippedRows: 0,
    status: 'processing' as const,
    errorLog: null,
    warnings: [],
    createdAt: '2026-02-28T00:00:00Z',
    updatedAt: '2026-02-28T00:00:00Z',
  },
];

describe('FR-049: ImportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-049: renders import history list', () => {
    vi.mocked(useImports).mockReturnValue({
      data: {
        data: mockImports,
        meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useImports>);

    render(<ImportsPage />);

    expect(screen.getByText('Data Imports')).toBeDefined();
    expect(screen.getByText('accounts.csv')).toBeDefined();
    expect(screen.getByText('products.xlsx')).toBeDefined();
    expect(screen.getByText('completed')).toBeDefined();
    expect(screen.getByText('processing')).toBeDefined();
  });

  test('FR-049: shows completed import stats', () => {
    vi.mocked(useImports).mockReturnValue({
      data: {
        data: mockImports,
        meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useImports>);

    render(<ImportsPage />);

    expect(screen.getByText('195 created')).toBeDefined();
    expect(screen.getByText('5 skipped')).toBeDefined();
  });

  test('FR-049: has new import button', () => {
    vi.mocked(useImports).mockReturnValue({
      data: {
        data: mockImports,
        meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useImports>);

    render(<ImportsPage />);

    expect(screen.getByText('New Import')).toBeDefined();
  });

  test('FR-049: shows loading state', () => {
    vi.mocked(useImports).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useImports>);

    const { container } = render(<ImportsPage />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('FR-049: shows error state', () => {
    vi.mocked(useImports).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useImports>);

    render(<ImportsPage />);

    expect(screen.getByText('Failed to load imports')).toBeDefined();
  });

  test('FR-049: shows empty state', () => {
    vi.mocked(useImports).mockReturnValue({
      data: {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useImports>);

    render(<ImportsPage />);

    expect(screen.getByText('No imports yet')).toBeDefined();
  });
});

describe('FR-049: ImportWizardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUploadImport).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUploadImport>);
    vi.mocked(useConfirmImport).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useConfirmImport>);
  });

  test('FR-049: renders step 1 with entity type selector', () => {
    render(<ImportWizardPage />);

    expect(screen.getByText('Import Data')).toBeDefined();
    expect(screen.getByText('Select Entity Type')).toBeDefined();
    expect(screen.getByLabelText(/What type of data/)).toBeDefined();
    expect(screen.getByText('Next')).toBeDefined();
  });

  test('FR-049: navigates to upload step', () => {
    render(<ImportWizardPage />);

    fireEvent.click(screen.getByText('Next'));

    // "Upload File" appears in step indicator and card title
    const uploadTexts = screen.getAllByText('Upload File');
    expect(uploadTexts.length).toBeGreaterThanOrEqual(1);
  });

  test('FR-049: shows file dropzone on upload step', () => {
    render(<ImportWizardPage />);

    fireEvent.click(screen.getByText('Next'));

    expect(screen.getByTestId('file-dropzone')).toBeDefined();
  });

  test('FR-049: upload button triggers mutation', () => {
    const mutateFn = vi.fn();
    vi.mocked(useUploadImport).mockReturnValue({
      mutate: mutateFn,
      isPending: false,
    } as unknown as ReturnType<typeof useUploadImport>);

    render(<ImportWizardPage />);

    // Go to upload step
    fireEvent.click(screen.getByText('Next'));

    // Select file
    fireEvent.click(screen.getByTestId('file-dropzone'));

    // Click upload
    fireEvent.click(screen.getByText('Upload & Preview'));

    expect(mutateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'account',
        file: expect.any(File),
      }),
      expect.anything(),
    );
  });

  test('FR-049: step indicators show correct state', () => {
    render(<ImportWizardPage />);

    expect(screen.getByText('Select Type')).toBeDefined();
    expect(screen.getByText('Upload File')).toBeDefined();
    expect(screen.getByText('Preview')).toBeDefined();
    expect(screen.getByText('Confirm')).toBeDefined();
  });

  test('FR-049: back button returns to previous step', () => {
    render(<ImportWizardPage />);

    fireEvent.click(screen.getByText('Next'));
    const uploadTexts = screen.getAllByText('Upload File');
    expect(uploadTexts.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Select Entity Type')).toBeDefined();
  });
});
