import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReportBuilderPage from '@/app/(authenticated)/reports/new/page';

vi.mock('@/hooks/use-reports', () => ({
  useCreateReport: vi.fn(),
  useExecuteReport: vi.fn(),
  useExportReport: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { useCreateReport, useExecuteReport, useExportReport } from '@/hooks/use-reports';

describe('FR-046: ReportBuilderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCreateReport).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateReport>);
    vi.mocked(useExecuteReport).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: undefined,
    } as unknown as ReturnType<typeof useExecuteReport>);
    vi.mocked(useExportReport).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useExportReport>);
  });

  test('FR-046: renders report builder with entity type selector', () => {
    render(<ReportBuilderPage />);

    const titleElements = screen.getAllByText('New Report');
    expect(titleElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText('Entity Type')).toBeDefined();
    expect(screen.getByLabelText('Report Name')).toBeDefined();
  });

  test('FR-046: shows column checkboxes for selected entity type', () => {
    render(<ReportBuilderPage />);

    // Default entity is ACCOUNT
    expect(screen.getByText('Account Name')).toBeDefined();
    expect(screen.getByText('Territory')).toBeDefined();
    expect(screen.getByText('Account Type')).toBeDefined();
  });

  test('FR-046: switching entity type changes available columns', () => {
    render(<ReportBuilderPage />);

    const entitySelect = screen.getByLabelText('Entity Type');
    fireEvent.change(entitySelect, { target: { value: 'ORDER' } });

    expect(screen.getByText('Order Number')).toBeDefined();
    expect(screen.getByText('Revenue Model')).toBeDefined();
  });

  test('FR-046: has preview, save, CSV and XLSX buttons', () => {
    render(<ReportBuilderPage />);

    expect(screen.getByText('Preview')).toBeDefined();
    expect(screen.getByText('Save Report')).toBeDefined();
    expect(screen.getByText('CSV')).toBeDefined();
    expect(screen.getByText('XLSX')).toBeDefined();
  });

  test('FR-046: select all toggles all columns', () => {
    render(<ReportBuilderPage />);

    fireEvent.click(screen.getByText('Select All'));

    // All checkboxes should be checked
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((checkbox) => {
      expect((checkbox as HTMLInputElement).checked).toBe(true);
    });
  });

  test('FR-046: preview button calls useExecuteReport', () => {
    const mutateFn = vi.fn();
    vi.mocked(useExecuteReport).mockReturnValue({
      mutate: mutateFn,
      isPending: false,
      data: undefined,
    } as unknown as ReturnType<typeof useExecuteReport>);

    render(<ReportBuilderPage />);

    // Select a column first
    fireEvent.click(screen.getByText('Select All'));
    fireEvent.click(screen.getByText('Preview'));

    expect(mutateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'ACCOUNT',
        columns: expect.any(Array),
      }),
      expect.anything(),
    );
  });

  test('FR-046: shows results table after preview', () => {
    vi.mocked(useExecuteReport).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: {
        data: [{ name: 'Coffee Co', accountType: 'retail' }],
        pagination: { cursor: null, hasMore: false, total: 1 },
        truncated: false,
        columns: [
          { key: 'name', label: 'Account Name', type: 'string' as const },
          { key: 'accountType', label: 'Account Type', type: 'string' as const },
        ],
      },
    } as unknown as ReturnType<typeof useExecuteReport>);

    render(<ReportBuilderPage />);

    expect(screen.getByText('Preview (1 records)')).toBeDefined();
    expect(screen.getByText('Coffee Co')).toBeDefined();
    expect(screen.getByText('retail')).toBeDefined();
  });

  test('FR-046: has date range filters', () => {
    render(<ReportBuilderPage />);

    expect(screen.getByLabelText('Start Date')).toBeDefined();
    expect(screen.getByLabelText('End Date')).toBeDefined();
  });

  test('FR-046: shows placeholder when no results', () => {
    render(<ReportBuilderPage />);

    expect(screen.getByText('Select columns and click Preview to see results')).toBeDefined();
  });

  test('FR-046: save report calls useCreateReport with name', () => {
    const mutateFn = vi.fn();
    vi.mocked(useCreateReport).mockReturnValue({
      mutate: mutateFn,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateReport>);

    render(<ReportBuilderPage />);

    const nameInput = screen.getByLabelText('Report Name');
    fireEvent.change(nameInput, { target: { value: 'My Report' } });
    fireEvent.click(screen.getByText('Select All'));
    fireEvent.click(screen.getByText('Save Report'));

    expect(mutateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'My Report',
        entityType: 'ACCOUNT',
        columns: expect.any(Array),
      }),
      expect.anything(),
    );
  });
});
