import { describe, test, expect, vi, beforeEach } from 'vitest';
import { exportStatements, CommissionExportError } from './commission-export.service';
import type { AuditContext } from './commission-rule.service';
import type { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const { mockWriteAuditLog } = vi.hoisted(() => ({
  mockWriteAuditLog: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../shared/services/audit.service', () => ({
  writeAuditLog: mockWriteAuditLog,
}));

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const REP_ID = '00000000-0000-4000-a000-000000000020';
const REP_ID_2 = '00000000-0000-4000-a000-000000000021';
const ADMIN_ID = '00000000-0000-4000-a000-000000000010';
const STATEMENT_ID_1 = '00000000-0000-4000-a000-000000000080';
const STATEMENT_ID_2 = '00000000-0000-4000-a000-000000000081';
const EXPORT_ID = '00000000-0000-4000-a000-000000000200';

const AUDIT_CTX: AuditContext = {
  actorId: ADMIN_ID,
  actorEmail: 'admin@test.com',
  ipAddress: '127.0.0.1',
  requestId: 'req-1',
};

function createMockStatement(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: STATEMENT_ID_1,
    tenantId: TENANT_ID,
    repId: REP_ID,
    month: 3,
    year: 2026,
    status: 'approved',
    totalEarned: new Decimal('1500.00'),
    ytdTotal: new Decimal('4500.00'),
    approvedBy: ADMIN_ID,
    approvedAt: new Date('2026-03-10T00:00:00.000Z'),
    exportedAt: null,
    version: 1,
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-01'),
    rep: { id: REP_ID, firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com' },
    approver: { id: ADMIN_ID, firstName: 'Admin', lastName: 'User' },
    entries: [{ id: 'entry-1' }, { id: 'entry-2' }, { id: 'entry-3' }],
    disputes: [],
    ...overrides,
  };
}

function createMockPrisma(): {
  prisma: PrismaClient;
  commissionExport: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  commissionStatement: {
    findMany: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
} {
  const commissionExport = {
    findFirst: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  };

  const commissionStatement = {
    findMany: vi.fn(),
    updateMany: vi.fn(),
  };

  const prisma = {
    commissionExport,
    commissionStatement,
    auditLog: { create: vi.fn() },
    $transaction: vi.fn().mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ commissionExport, commissionStatement }),
    ),
  } as unknown as PrismaClient;

  return { prisma, commissionExport, commissionStatement };
}

describe('FR-022: Commission export service', () => {
  let prisma: PrismaClient;
  let commissionExport: ReturnType<typeof createMockPrisma>['commissionExport'];
  let commissionStatement: ReturnType<typeof createMockPrisma>['commissionStatement'];

  beforeEach(() => {
    vi.clearAllMocks();
    const mocks = createMockPrisma();
    prisma = mocks.prisma;
    commissionExport = mocks.commissionExport;
    commissionStatement = mocks.commissionStatement;
  });

  test('FR-022: exports approved statements as CSV', async () => {
    const stmt1 = createMockStatement();
    const stmt2 = createMockStatement({
      id: STATEMENT_ID_2,
      repId: REP_ID_2,
      totalEarned: new Decimal('800.00'),
      rep: { id: REP_ID_2, firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com' },
      entries: [{ id: 'entry-4' }, { id: 'entry-5' }],
    });

    commissionExport.findFirst.mockResolvedValue(null);
    commissionExport.count.mockResolvedValue(4);
    commissionStatement.findMany.mockResolvedValue([stmt1, stmt2]);
    commissionExport.create.mockResolvedValue({
      id: EXPORT_ID,
      tenantId: TENANT_ID,
      referenceId: 'QB-2026-03-005',
      month: 3,
      year: 2026,
      format: 'csv',
      status: 'completed',
      createdBy: ADMIN_ID,
      createdAt: new Date(),
      creator: { id: ADMIN_ID, firstName: 'Admin', lastName: 'User', email: 'admin@test.com' },
      statements: [],
    });
    commissionStatement.updateMany.mockResolvedValue({ count: 2 });

    const result = await exportStatements(prisma, TENANT_ID, 3, 2026, false, AUDIT_CTX);

    expect(result).toBeDefined();
    expect(result.statementsIncluded).toBe(2);
    expect(result.csv).toContain('Rep Name');
    expect(result.csv).toContain('Rep Email');
    expect(result.csv).toContain('Total Commission');
    expect(result.csv).toContain('Jane Smith');
    expect(result.csv).toContain('Bob Jones');
  });

  test('FR-022: generates reference ID with sequential numbering (QB-YYYY-MM-NNN)', async () => {
    commissionExport.findFirst.mockResolvedValue(null);
    commissionExport.count.mockResolvedValue(7);
    commissionStatement.findMany.mockResolvedValue([createMockStatement()]);
    commissionExport.create.mockImplementation(async (args: Record<string, unknown>) => ({
      id: EXPORT_ID,
      ...(args as { data: Record<string, unknown> }).data,
      creator: { id: ADMIN_ID, firstName: 'Admin', lastName: 'User', email: 'admin@test.com' },
      statements: [],
    }));
    commissionStatement.updateMany.mockResolvedValue({ count: 1 });

    await exportStatements(prisma, TENANT_ID, 3, 2026, false, AUDIT_CTX);

    const createCall = commissionExport.create.mock.calls[0]![0] as { data: { referenceId: string } };
    expect(createCall.data.referenceId).toBe('QB-2026-03-008');
  });

  test('FR-022: marks exported statements as "exported" status', async () => {
    commissionExport.findFirst.mockResolvedValue(null);
    commissionExport.count.mockResolvedValue(0);
    commissionStatement.findMany.mockResolvedValue([createMockStatement()]);
    commissionExport.create.mockResolvedValue({
      id: EXPORT_ID,
      creator: { id: ADMIN_ID, firstName: 'Admin', lastName: 'User', email: 'admin@test.com' },
      statements: [],
    });
    commissionStatement.updateMany.mockResolvedValue({ count: 1 });

    await exportStatements(prisma, TENANT_ID, 3, 2026, false, AUDIT_CTX);

    expect(commissionStatement.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: [STATEMENT_ID_1] },
          tenantId: TENANT_ID,
        }),
        data: expect.objectContaining({
          status: 'exported',
        }),
      }),
    );
  });

  test('FR-022: rejects re-export if already exported and forceReExport is false', async () => {
    commissionExport.findFirst.mockResolvedValue({
      id: EXPORT_ID,
      referenceId: 'QB-2026-03-001',
    });

    await expect(
      exportStatements(prisma, TENANT_ID, 3, 2026, false, AUDIT_CTX),
    ).rejects.toThrow(CommissionExportError);
  });

  test('FR-022: allows re-export when forceReExport is true', async () => {
    commissionExport.findFirst.mockResolvedValue({
      id: EXPORT_ID,
      referenceId: 'QB-2026-03-001',
    });
    commissionStatement.findMany.mockResolvedValue([createMockStatement()]);
    commissionExport.count.mockResolvedValue(1);
    commissionExport.create.mockResolvedValue({
      id: 'new-export-id',
      creator: { id: ADMIN_ID, firstName: 'Admin', lastName: 'User', email: 'admin@test.com' },
      statements: [],
    });
    commissionStatement.updateMany.mockResolvedValue({ count: 1 });

    const result = await exportStatements(prisma, TENANT_ID, 3, 2026, true, AUDIT_CTX);

    expect(result).toBeDefined();
    expect(commissionExport.create).toHaveBeenCalledOnce();
  });

  test('FR-022: queries only for approved statements', async () => {
    commissionExport.findFirst.mockResolvedValue(null);
    commissionExport.count.mockResolvedValue(0);
    commissionStatement.findMany.mockResolvedValue([createMockStatement()]);
    commissionExport.create.mockResolvedValue({
      id: EXPORT_ID,
      creator: { id: ADMIN_ID, firstName: 'Admin', lastName: 'User', email: 'admin@test.com' },
      statements: [],
    });
    commissionStatement.updateMany.mockResolvedValue({ count: 1 });

    await exportStatements(prisma, TENANT_ID, 3, 2026, false, AUDIT_CTX);

    expect(commissionStatement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT_ID,
          status: 'approved',
          month: 3,
          year: 2026,
        }),
      }),
    );
  });

  test('FR-022: calculates correct total amount across all statements', async () => {
    const stmt1 = createMockStatement({ totalEarned: new Decimal('1500.00') });
    const stmt2 = createMockStatement({
      id: STATEMENT_ID_2,
      repId: REP_ID_2,
      totalEarned: new Decimal('800.00'),
      rep: { id: REP_ID_2, firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com' },
    });

    commissionExport.findFirst.mockResolvedValue(null);
    commissionExport.count.mockResolvedValue(0);
    commissionStatement.findMany.mockResolvedValue([stmt1, stmt2]);
    commissionExport.create.mockResolvedValue({
      id: EXPORT_ID,
      creator: { id: ADMIN_ID, firstName: 'Admin', lastName: 'User', email: 'admin@test.com' },
      statements: [],
    });
    commissionStatement.updateMany.mockResolvedValue({ count: 2 });

    const result = await exportStatements(prisma, TENANT_ID, 3, 2026, false, AUDIT_CTX);

    expect(result.totalAmount).toBe(2300);
  });

  test('FR-022: uses entries.length for order count in CSV', async () => {
    const stmt = createMockStatement({
      entries: [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }, { id: 'e4' }, { id: 'e5' }],
    });

    commissionExport.findFirst.mockResolvedValue(null);
    commissionExport.count.mockResolvedValue(0);
    commissionStatement.findMany.mockResolvedValue([stmt]);
    commissionExport.create.mockResolvedValue({
      id: EXPORT_ID,
      creator: { id: ADMIN_ID, firstName: 'Admin', lastName: 'User', email: 'admin@test.com' },
      statements: [],
    });
    commissionStatement.updateMany.mockResolvedValue({ count: 1 });

    const result = await exportStatements(prisma, TENANT_ID, 3, 2026, false, AUDIT_CTX);

    // CSV should contain Order Count column with value 5
    expect(result.csv).toContain('Order Count');
    expect(result.csv).toContain(',5,');
  });

  test('FR-022: writes audit log on successful export', async () => {
    commissionExport.findFirst.mockResolvedValue(null);
    commissionExport.count.mockResolvedValue(0);
    commissionStatement.findMany.mockResolvedValue([createMockStatement()]);
    commissionExport.create.mockResolvedValue({
      id: EXPORT_ID,
      creator: { id: ADMIN_ID, firstName: 'Admin', lastName: 'User', email: 'admin@test.com' },
      statements: [],
    });
    commissionStatement.updateMany.mockResolvedValue({ count: 1 });

    await exportStatements(prisma, TENANT_ID, 3, 2026, false, AUDIT_CTX);

    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'CommissionExport',
        action: 'create',
        actorId: ADMIN_ID,
        tenantId: TENANT_ID,
        changeSummary: expect.objectContaining({
          month: 3,
          year: 2026,
          statementsIncluded: 1,
        }),
      }),
    );
  });
});
