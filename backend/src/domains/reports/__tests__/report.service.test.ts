import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createReport, getReport, listReports, deleteReport } from '../report.service';
import type { PrismaClient } from '@prisma/client';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const USER_ID = '00000000-0000-4000-a000-000000000010';
const OTHER_USER_ID = '00000000-0000-4000-a000-000000000011';
const REPORT_ID = '00000000-0000-4000-a000-000000000090';

const AUDIT = {
  actorId: USER_ID,
  actorEmail: 'manager@test.com',
  ipAddress: '127.0.0.1',
  userAgent: 'test',
  requestId: '00000000-0000-4000-a000-000000000099',
};

const MOCK_REPORT = {
  id: REPORT_ID,
  tenantId: TENANT_ID,
  createdById: USER_ID,
  name: 'Test Report',
  description: 'A test report',
  entityType: 'ORDER',
  filters: {},
  columns: ['orderNumber', 'total'],
  isShared: false,
  lastRunAt: null,
  deletedAt: null,
  createdAt: new Date('2026-02-26T10:00:00Z'),
  updatedAt: new Date('2026-02-26T10:00:00Z'),
  createdBy: { id: USER_ID, firstName: 'Jane', lastName: 'Manager' },
};

function createMockPrisma(): {
  prisma: PrismaClient;
  mocks: Record<string, Record<string, ReturnType<typeof vi.fn>>>;
} {
  const savedReport = {
    create: vi.fn().mockResolvedValue(MOCK_REPORT),
    findFirst: vi.fn().mockResolvedValue(MOCK_REPORT),
    findMany: vi.fn().mockResolvedValue([MOCK_REPORT]),
    count: vi.fn().mockResolvedValue(1),
    update: vi.fn().mockResolvedValue(MOCK_REPORT),
  };
  const auditLog = { create: vi.fn() };

  return {
    prisma: { savedReport, auditLog } as unknown as PrismaClient,
    mocks: { savedReport, auditLog },
  };
}

describe('FR-025: Report CRUD service', () => {
  let prisma: PrismaClient;
  let mocks: Record<string, Record<string, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockPrisma();
    prisma = mock.prisma;
    mocks = mock.mocks;
  });

  describe('createReport', () => {
    test('FR-025: creates a report with valid columns', async () => {
      const result = await createReport(prisma, TENANT_ID, USER_ID, {
        name: 'Test Report',
        entityType: 'ORDER',
        filters: {},
        columns: ['orderNumber', 'total'],
        isShared: false,
      }, AUDIT);

      expect(result.id).toBe(REPORT_ID);
      expect(result.name).toBe('Test Report');
      expect(result.entityType).toBe('ORDER');
      expect(mocks['savedReport']!['create']).toHaveBeenCalledTimes(1);
      expect(mocks['auditLog']!['create']).toHaveBeenCalledTimes(1);
    });

    test('FR-025: throws for invalid column names', async () => {
      await expect(
        createReport(prisma, TENANT_ID, USER_ID, {
          name: 'Bad Report',
          entityType: 'ORDER',
          filters: {},
          columns: ['orderNumber', 'nonExistentField'],
          isShared: false,
        }, AUDIT),
      ).rejects.toThrow('Invalid columns');
    });
  });

  describe('getReport', () => {
    test('FR-025: returns report for owner', async () => {
      const result = await getReport(prisma, TENANT_ID, USER_ID, 'manager', REPORT_ID);
      expect(result.id).toBe(REPORT_ID);
    });

    test('FR-025: returns shared report for non-owner', async () => {
      mocks['savedReport']!['findFirst']!.mockResolvedValue({ ...MOCK_REPORT, isShared: true });
      const result = await getReport(prisma, TENANT_ID, OTHER_USER_ID, 'manager', REPORT_ID);
      expect(result.id).toBe(REPORT_ID);
    });

    test('FR-025: throws for non-owner accessing private report', async () => {
      await expect(
        getReport(prisma, TENANT_ID, OTHER_USER_ID, 'manager', REPORT_ID),
      ).rejects.toThrow('Report not found');
    });

    test('FR-025: admin can access any report', async () => {
      const result = await getReport(prisma, TENANT_ID, OTHER_USER_ID, 'admin', REPORT_ID);
      expect(result.id).toBe(REPORT_ID);
    });

    test('FR-025: throws for non-existent report', async () => {
      mocks['savedReport']!['findFirst']!.mockResolvedValue(null);
      await expect(
        getReport(prisma, TENANT_ID, USER_ID, 'manager', 'nonexistent-id'),
      ).rejects.toThrow('Report not found');
    });
  });

  describe('listReports', () => {
    test('FR-025: returns own and shared reports', async () => {
      const result = await listReports(prisma, TENANT_ID, USER_ID, { limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    test('FR-025: supports cursor pagination', async () => {
      mocks['savedReport']!['findMany']!.mockResolvedValue([MOCK_REPORT, { ...MOCK_REPORT, id: 'extra' }]);
      const result = await listReports(prisma, TENANT_ID, USER_ID, { limit: 1 });
      expect(result.data).toHaveLength(1);
      expect(result.pagination.hasMore).toBe(true);
    });
  });

  describe('deleteReport', () => {
    test('FR-025: owner can delete their report', async () => {
      await deleteReport(prisma, TENANT_ID, USER_ID, 'manager', REPORT_ID, AUDIT);
      expect(mocks['savedReport']!['update']).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: REPORT_ID },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    test('FR-025: admin can delete any report', async () => {
      await deleteReport(prisma, TENANT_ID, OTHER_USER_ID, 'admin', REPORT_ID, AUDIT);
      expect(mocks['savedReport']!['update']).toHaveBeenCalled();
    });

    test('FR-025: non-owner cannot delete report', async () => {
      await expect(
        deleteReport(prisma, TENANT_ID, OTHER_USER_ID, 'manager', REPORT_ID, AUDIT),
      ).rejects.toThrow('Not authorized');
    });

    test('FR-025: throws for non-existent report', async () => {
      mocks['savedReport']!['findFirst']!.mockResolvedValue(null);
      await expect(
        deleteReport(prisma, TENANT_ID, USER_ID, 'manager', 'nonexistent-id', AUDIT),
      ).rejects.toThrow('Report not found');
    });
  });
});
