/**
 * Import service unit tests.
 * T108: Validates CSV/XLSX import validation, preview, execution,
 * file size limits, and data quality scorecard.
 * Tests reference FR-031, FR-032, FR-033.
 */
import { describe, expect, test, vi, beforeEach } from 'vitest';

import {
  validateFileSize,
  validateImportData,
  createImportJob,
  updateImportPreview,
  listImportJobs,
  executeImport,
  completeImport,
  calculateDataQuality,
  saveDataQualityScore,
  getDataQualityScorecard,
  MAX_FILE_SIZE_BYTES,
} from './import.service.js';

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------

function createMockPrisma() {
  return {
    importJob: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    account: {
      count: vi.fn(),
    },
    contact: {
      count: vi.fn(),
    },
    product: {
      count: vi.fn(),
    },
    dataQualityScore: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockPrisma = ReturnType<typeof createMockPrisma> & Record<string, any>;

const TEST_TENANT_ID = '660e8400-e29b-41d4-a716-446655440000';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_IMPORT_JOB_ID = 'aae08400-e29b-41d4-a716-446655440001';

const NOW = new Date('2026-02-25T12:00:00.000Z');

// ---------------------------------------------------------------------------
// File Size Validation Tests (FR-032)
// ---------------------------------------------------------------------------

describe('File Size Validation (FR-032)', () => {
  test('FR-032: accepts files under 50 MB', () => {
    expect(() => validateFileSize(10 * 1024 * 1024)).not.toThrow();
  });

  test('FR-032: accepts files at exactly 50 MB', () => {
    expect(() => validateFileSize(MAX_FILE_SIZE_BYTES)).not.toThrow();
  });

  test('FR-032: rejects files exceeding 50 MB with descriptive error', () => {
    expect(() => validateFileSize(MAX_FILE_SIZE_BYTES + 1)).toThrow(
      'Import file exceeds the 50 MB limit',
    );
  });

  test('FR-032: error has correct status code 413', () => {
    try {
      validateFileSize(MAX_FILE_SIZE_BYTES + 1);
    } catch (error: unknown) {
      const err = error as Error & { statusCode: number; code: string };
      expect(err.statusCode).toBe(413);
      expect(err.code).toBe('IMPORT_FILE_TOO_LARGE');
    }
  });
});

// ---------------------------------------------------------------------------
// CSV Validation Tests (FR-031)
// ---------------------------------------------------------------------------

describe('Import Data Validation (FR-031)', () => {
  test('FR-031: validates 200 rows with 5 invalid — shows 195 valid, 5 errors', () => {
    const headers = ['name', 'account_type', 'address_line1', 'city', 'state', 'zip_code'];
    const rows: string[][] = [];

    // 195 valid rows
    for (let i = 0; i < 195; i++) {
      rows.push([`Account ${i}`, 'store', `${i} Main St`, 'Portland', 'OR', '97201']);
    }
    // 5 invalid rows (bad zip codes)
    for (let i = 0; i < 5; i++) {
      rows.push([`Bad Account ${i}`, 'store', `${i} Bad St`, 'Portland', 'OR', 'ABC']);
    }

    const result = validateImportData('account', headers, rows);

    expect(result.validRows).toHaveLength(195);
    expect(result.errors.length).toBeGreaterThanOrEqual(5);
  });

  test('FR-031: identifies unmapped columns with warning', () => {
    const headers = ['name', 'account_type', 'address_line1', 'city', 'state', 'zip_code', 'custom_field_1', 'notes_old'];
    const rows = [['Test', 'store', '123 Main', 'Portland', 'OR', '97201', 'custom', 'old note']];

    const result = validateImportData('account', headers, rows);

    expect(result.unmappedColumns).toEqual(['custom_field_1', 'notes_old']);
  });

  test('FR-031: validates required fields per entity type', () => {
    const headers = ['name', 'account_type', 'address_line1', 'city', 'state', 'zip_code'];
    const rows = [['', 'store', '123 Main', 'Portland', 'OR', '97201']]; // Missing name

    const result = validateImportData('account', headers, rows);

    expect(result.validRows).toHaveLength(0);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'name', message: 'name is required' }),
    );
  });

  test('FR-031: validates account_type enum values', () => {
    const headers = ['name', 'account_type', 'address_line1', 'city', 'state', 'zip_code'];
    const rows = [['Test', 'bakery', '123 Main', 'Portland', 'OR', '97201']];

    const result = validateImportData('account', headers, rows);

    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'account_type',
        value: 'bakery',
        message: 'Must be one of: store, restaurant, distributor, other',
      }),
    );
  });

  test('FR-031: validates email format for contacts', () => {
    const headers = ['first_name', 'last_name', 'email', 'account_name'];
    const rows = [['Jane', 'Smith', 'not-an-email', 'Pacific Bistro']];

    const result = validateImportData('contact', headers, rows);

    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'email', message: 'Invalid email format' }),
    );
  });

  test('FR-031: validates zip code format', () => {
    const headers = ['name', 'account_type', 'address_line1', 'city', 'state', 'zip_code'];
    const rows = [['Test', 'store', '123 Main', 'Portland', 'OR', 'XYZ']];

    const result = validateImportData('account', headers, rows);

    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'zip_code', message: 'Invalid ZIP code format' }),
    );
  });

  test('FR-031: validates product revenue_model enum', () => {
    const headers = ['name', 'sku', 'brand_name', 'category', 'unit_price', 'revenue_model'];
    const rows = [['Honey', 'SKU-001', 'Brand A', 'Food', '12.99', 'direct']];

    const result = validateImportData('product', headers, rows);

    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'revenue_model', message: 'Must be one of: broker, wholesale' }),
    );
  });

  test('FR-031: validates price is non-negative number', () => {
    const headers = ['name', 'sku', 'brand_name', 'category', 'unit_price', 'revenue_model'];
    const rows = [['Honey', 'SKU-001', 'Brand A', 'Food', '-5.00', 'broker']];

    const result = validateImportData('product', headers, rows);

    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'unit_price',
        message: 'unit_price must be a non-negative number',
      }),
    );
  });

  test('FR-031: accepts all valid rows with correct data', () => {
    const headers = ['name', 'account_type', 'address_line1', 'city', 'state', 'zip_code'];
    const rows = [
      ['Pacific Bistro', 'restaurant', '123 Main St', 'Portland', 'OR', '97201'],
      ['Mountain Coffee', 'store', '456 Oak Ave', 'Bend', 'OR', '97701'],
    ];

    const result = validateImportData('account', headers, rows);

    expect(result.validRows).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Import Job CRUD Tests (FR-031)
// ---------------------------------------------------------------------------

describe('Import Job Management (FR-031)', () => {
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    vi.clearAllMocks();
  });

  test('FR-031: creates import job after upload', async () => {
    prisma.importJob.create.mockResolvedValue({
      id: TEST_IMPORT_JOB_ID,
      tenant_id: TEST_TENANT_ID,
      entity_type: 'account',
      file_name: 'accounts.csv',
      file_size_bytes: 1250000,
      status: 'uploaded',
    });

    const result = await createImportJob(
      prisma, TEST_TENANT_ID, TEST_USER_ID,
      'account', 'accounts.csv', 1250000,
    );

    expect(result.status).toBe('uploaded');
    expect(result.entity_type).toBe('account');
  });

  test('FR-032: createImportJob rejects file exceeding 50 MB', async () => {
    await expect(
      createImportJob(
        prisma, TEST_TENANT_ID, TEST_USER_ID,
        'account', 'large.csv', MAX_FILE_SIZE_BYTES + 1,
      ),
    ).rejects.toThrow('Import file exceeds the 50 MB limit');
  });

  test('FR-031: updates import job with preview data', async () => {
    prisma.importJob.findFirst.mockResolvedValue({ id: TEST_IMPORT_JOB_ID });
    prisma.importJob.update.mockResolvedValue({
      id: TEST_IMPORT_JOB_ID,
      status: 'preview',
      total_rows: 200,
      valid_rows: 195,
      error_rows: 5,
    });

    const result = await updateImportPreview(
      prisma, TEST_TENANT_ID, TEST_IMPORT_JOB_ID,
      200, 195, 5, {},
    );

    expect(result!.status).toBe('preview');
    expect(result!.valid_rows).toBe(195);
    expect(result!.error_rows).toBe(5);
  });

  test('FR-031: lists import jobs with pagination', async () => {
    prisma.importJob.findMany.mockResolvedValue([
      { id: '1', entity_type: 'account', status: 'completed' },
    ]);
    prisma.importJob.count.mockResolvedValue(8);

    const result = await listImportJobs(prisma, TEST_TENANT_ID, { page: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(8);
  });

  test('FR-031: filters import jobs by entity type', async () => {
    prisma.importJob.findMany.mockResolvedValue([]);
    prisma.importJob.count.mockResolvedValue(0);

    await listImportJobs(prisma, TEST_TENANT_ID, { entityType: 'account' });

    expect(prisma.importJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ entity_type: 'account' }),
      }),
    );
  });

  test('FR-031: executes import only from preview status', async () => {
    prisma.importJob.findFirst.mockResolvedValue({
      id: TEST_IMPORT_JOB_ID,
      status: 'uploaded', // Not preview!
    });

    await expect(
      executeImport(prisma, TEST_TENANT_ID, TEST_IMPORT_JOB_ID, true),
    ).rejects.toThrow('Import can only be executed from preview status');
  });

  test('FR-031: executes import from preview status', async () => {
    prisma.importJob.findFirst.mockResolvedValue({
      id: TEST_IMPORT_JOB_ID,
      status: 'preview',
      valid_rows: 195,
      file_name: 'accounts.csv',
    });
    prisma.importJob.update.mockResolvedValue({
      id: TEST_IMPORT_JOB_ID,
      status: 'importing',
    });

    const result = await executeImport(prisma, TEST_TENANT_ID, TEST_IMPORT_JOB_ID, true);

    expect(result!.status).toBe('importing');
  });

  test('FR-031: completes import with row count', async () => {
    prisma.importJob.update.mockResolvedValue({
      id: TEST_IMPORT_JOB_ID,
      status: 'completed',
      imported_rows: 195,
      completed_at: NOW,
    });

    const result = await completeImport(prisma, TEST_IMPORT_JOB_ID, 195, null);

    expect(result.status).toBe('completed');
    expect(result.imported_rows).toBe(195);
  });
});

// ---------------------------------------------------------------------------
// Data Quality Scorecard Tests (FR-033)
// ---------------------------------------------------------------------------

describe('Data Quality Scorecard (FR-033)', () => {
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    vi.clearAllMocks();
  });

  test('FR-033: calculates data quality metrics', async () => {
    prisma.account.count.mockResolvedValueOnce(100); // total
    prisma.account.count.mockResolvedValueOnce(92);  // complete
    prisma.contact.count.mockResolvedValueOnce(200); // total
    prisma.contact.count.mockResolvedValueOnce(177); // with email
    prisma.product.count.mockResolvedValueOnce(50);  // total
    prisma.product.count.mockResolvedValueOnce(38);  // with image
    prisma.account.count.mockResolvedValueOnce(12);  // stale

    const metrics = await calculateDataQuality(prisma, TEST_TENANT_ID);

    expect(metrics.accountFieldCompletenessPct).toBe(92);
    expect(metrics.contactEmailValidityPct).toBe(88.5);
    expect(metrics.productImageCoveragePct).toBe(76);
    expect(metrics.staleAccountCount).toBe(12);
  });

  test('FR-033: handles zero records gracefully', async () => {
    prisma.account.count.mockResolvedValue(0);
    prisma.contact.count.mockResolvedValue(0);
    prisma.product.count.mockResolvedValue(0);

    const metrics = await calculateDataQuality(prisma, TEST_TENANT_ID);

    expect(metrics.accountFieldCompletenessPct).toBe(100);
    expect(metrics.contactEmailValidityPct).toBe(100);
    expect(metrics.productImageCoveragePct).toBe(100);
  });

  test('FR-033: saves data quality score to database', async () => {
    prisma.dataQualityScore.create.mockResolvedValue({});

    await saveDataQualityScore(prisma, TEST_TENANT_ID, {
      accountFieldCompletenessPct: 92.3,
      contactEmailValidityPct: 88.7,
      productImageCoveragePct: 75.2,
      duplicateAccountCount: 8,
      staleAccountCount: 12,
    });

    expect(prisma.dataQualityScore.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenant_id: TEST_TENANT_ID,
          account_field_completeness_pct: 92.3,
        }),
      }),
    );
  });

  test('FR-033: retrieves latest scorecard with 7-day trend', async () => {
    prisma.dataQualityScore.findFirst.mockResolvedValue({
      calculated_at: NOW,
      overall_score: 87.5,
      account_field_completeness_pct: 92.3,
      contact_email_validity_pct: 88.7,
      product_image_coverage_pct: 75.2,
      duplicate_account_count: 8,
      stale_account_count: 12,
    });
    prisma.dataQualityScore.findMany.mockResolvedValue([
      { calculated_at: NOW, overall_score: 87.5 },
      { calculated_at: new Date('2026-02-24T02:00:00Z'), overall_score: 86.8 },
    ]);

    const scorecard = await getDataQualityScorecard(prisma, TEST_TENANT_ID);

    expect(scorecard).not.toBeNull();
    expect(scorecard!.overallScore).toBe(87.5);
    expect(scorecard!.trend).toHaveLength(2);
    expect(scorecard!.metrics.accountFieldCompletenessPct).toBe(92.3);
  });

  test('FR-033: returns null when no scorecard exists', async () => {
    prisma.dataQualityScore.findFirst.mockResolvedValue(null);

    const scorecard = await getDataQualityScorecard(prisma, TEST_TENANT_ID);

    expect(scorecard).toBeNull();
  });
});
