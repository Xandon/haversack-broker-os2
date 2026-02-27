import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  generateStatements,
  getStatement,
  listStatements,
  approveStatement,
  rejectStatement,
  formatStatementResponse,
  CommissionStatementError,
} from './commission-statement.service';
import type { AuditContext } from './commission-rule.service';
import type { PrismaClient, CommissionStatement, CommissionEntry, CommissionDispute } from '@prisma/client';
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
const STATEMENT_ID = '00000000-0000-4000-a000-000000000080';
const APPROVER_ID = '00000000-0000-4000-a000-000000000010';
const ENTRY_ID_1 = '00000000-0000-4000-a000-000000000090';
const ENTRY_ID_2 = '00000000-0000-4000-a000-000000000091';

const AUDIT_CTX: AuditContext = {
  actorId: APPROVER_ID,
  actorEmail: 'admin@haversack.com',
  ipAddress: '127.0.0.1',
  requestId: 'req-456',
};

const NOW = new Date('2026-03-01T00:00:00.000Z');

function createMockEntry(overrides: Partial<CommissionEntry> = {}): CommissionEntry {
  return {
    id: ENTRY_ID_1,
    tenantId: TENANT_ID,
    orderId: '00000000-0000-4000-a000-000000000070',
    orderLineItemId: '00000000-0000-4000-a000-000000000071',
    repId: REP_ID,
    commissionRuleId: '00000000-0000-4000-a000-000000000060',
    statementId: null,
    entryType: 'calculation',
    baseRate: new Decimal('0.1000'),
    territoryModifier: new Decimal('1.00'),
    volumeTierApplied: 'tier 1: 0-10000 (+0.0%)',
    effectiveRate: new Decimal('0.1000'),
    lineItemTotal: new Decimal('5000.00'),
    commissionAmount: new Decimal('500.00'),
    calculatedAt: new Date('2026-02-15'),
    createdAt: new Date('2026-02-15'),
    ...overrides,
  } as CommissionEntry;
}

function createMockStatement(
  overrides: Partial<CommissionStatement> = {},
): CommissionStatement & {
  rep: { id: string; firstName: string; lastName: string; email: string };
  approver: null;
  entries: CommissionEntry[];
  disputes: CommissionDispute[];
} {
  return {
    id: STATEMENT_ID,
    tenantId: TENANT_ID,
    repId: REP_ID,
    month: 2,
    year: 2026,
    status: 'pending',
    totalEarned: new Decimal('1200.00'),
    ytdTotal: new Decimal('3500.00'),
    approvedBy: null,
    approvedAt: null,
    exportedAt: null,
    version: 1,
    createdAt: NOW,
    updatedAt: NOW,
    rep: { id: REP_ID, firstName: 'Jane', lastName: 'Smith', email: 'jane@haversack.com' },
    approver: null,
    entries: [],
    disputes: [],
    ...overrides,
  } as CommissionStatement & {
    rep: { id: string; firstName: string; lastName: string; email: string };
    approver: null;
    entries: CommissionEntry[];
    disputes: CommissionDispute[];
  };
}

interface MockPrismaResult {
  prisma: PrismaClient;
  user: { findMany: ReturnType<typeof vi.fn> };
  commissionEntry: {
    findMany: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  commissionStatement: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
}

function createMockPrisma(): MockPrismaResult {
  const user = {
    findMany: vi.fn(),
  };

  const commissionEntry = {
    findMany: vi.fn(),
    aggregate: vi.fn(),
    updateMany: vi.fn(),
  };

  const commissionStatement = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };

  const prisma = {
    user,
    commissionEntry,
    commissionStatement,
    $transaction: vi.fn().mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ commissionStatement, commissionEntry }),
    ),
  } as unknown as PrismaClient;

  return { prisma, user, commissionEntry, commissionStatement };
}

describe('FR-021: Commission statement service', () => {
  let prisma: PrismaClient;
  let user: MockPrismaResult['user'];
  let commissionEntry: MockPrismaResult['commissionEntry'];
  let commissionStatement: MockPrismaResult['commissionStatement'];

  beforeEach(() => {
    vi.clearAllMocks();
    const mocks = createMockPrisma();
    prisma = mocks.prisma;
    user = mocks.user;
    commissionEntry = mocks.commissionEntry;
    commissionStatement = mocks.commissionStatement;
  });

  describe('generateStatements', () => {
    test('FR-021: generates statement with correct totals and YTD for active reps', async () => {
      const entries = [
        createMockEntry({ id: ENTRY_ID_1, commissionAmount: new Decimal('500.00') }),
        createMockEntry({ id: ENTRY_ID_2, commissionAmount: new Decimal('700.00') }),
      ];

      user.findMany.mockResolvedValue([
        { id: REP_ID, firstName: 'Jane', lastName: 'Smith', email: 'jane@haversack.com' },
      ]);

      commissionStatement.findFirst
        .mockResolvedValueOnce(null) // no existing statement
        .mockResolvedValueOnce(
          createMockStatement({
            totalEarned: new Decimal('1200.00'),
            ytdTotal: new Decimal('3500.00'),
            entries,
          }),
        ); // re-fetch

      commissionEntry.findMany.mockResolvedValue(entries);
      commissionEntry.aggregate.mockResolvedValue({
        _sum: { commissionAmount: new Decimal('3500.00') },
      });
      commissionEntry.updateMany.mockResolvedValue({ count: 2 });
      commissionStatement.create.mockResolvedValue(createMockStatement());

      const result = await generateStatements(prisma, TENANT_ID, 2, 2026, AUDIT_CTX);

      expect(result).toHaveLength(1);
      expect(commissionStatement.create).toHaveBeenCalledOnce();
      expect(commissionEntry.updateMany).toHaveBeenCalledOnce();
      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'CommissionStatement',
          action: 'create',
          changeSummary: expect.objectContaining({
            repId: REP_ID,
            month: 2,
            year: 2026,
            totalEarned: 1200,
            entryCount: 2,
          }),
        }),
      );
    });

    test('FR-021: generates zero-amount statement for rep with no orders', async () => {
      user.findMany.mockResolvedValue([
        { id: REP_ID_2, firstName: 'Bob', lastName: 'Jones', email: 'bob@haversack.com' },
      ]);

      commissionStatement.findFirst
        .mockResolvedValueOnce(null) // no existing
        .mockResolvedValueOnce(
          createMockStatement({
            repId: REP_ID_2,
            totalEarned: new Decimal('0.00'),
            ytdTotal: new Decimal('0.00'),
            entries: [],
          }),
        ); // re-fetch

      commissionEntry.findMany.mockResolvedValue([]); // no entries
      commissionEntry.aggregate.mockResolvedValue({
        _sum: { commissionAmount: null },
      });
      commissionStatement.create.mockResolvedValue(
        createMockStatement({
          repId: REP_ID_2,
          totalEarned: new Decimal('0.00'),
          ytdTotal: new Decimal('0.00'),
        }),
      );

      const result = await generateStatements(prisma, TENANT_ID, 2, 2026, AUDIT_CTX);

      expect(result).toHaveLength(1);
      expect(commissionStatement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalEarned: new Decimal('0.00'),
            ytdTotal: new Decimal('0.00'),
          }),
        }),
      );
      // Should not call updateMany since there are no entries
      expect(commissionEntry.updateMany).not.toHaveBeenCalled();
    });

    test('FR-021: skips reps that already have a statement for the period', async () => {
      user.findMany.mockResolvedValue([
        { id: REP_ID, firstName: 'Jane', lastName: 'Smith', email: 'jane@haversack.com' },
      ]);

      commissionStatement.findFirst.mockResolvedValueOnce(createMockStatement()); // already exists

      const result = await generateStatements(prisma, TENANT_ID, 2, 2026, AUDIT_CTX);

      expect(result).toHaveLength(0);
      expect(commissionStatement.create).not.toHaveBeenCalled();
    });
  });

  describe('getStatement', () => {
    test('FR-021: returns statement with entries and disputes', async () => {
      const statement = createMockStatement({ entries: [createMockEntry()] });
      commissionStatement.findFirst.mockResolvedValue(statement);

      const result = await getStatement(prisma, TENANT_ID, STATEMENT_ID);

      expect(result).toBeDefined();
      expect(result.id).toBe(STATEMENT_ID);
      expect(commissionStatement.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: STATEMENT_ID,
            tenantId: TENANT_ID,
          }),
        }),
      );
    });

    test('FR-021: throws NOT_FOUND for nonexistent statement', async () => {
      commissionStatement.findFirst.mockResolvedValue(null);

      await expect(
        getStatement(prisma, TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(CommissionStatementError);
    });
  });

  describe('listStatements', () => {
    test('FR-021: returns statements with cursor pagination', async () => {
      commissionStatement.findMany.mockResolvedValue([createMockStatement()]);
      commissionStatement.count.mockResolvedValue(1);

      const result = await listStatements(prisma, TENANT_ID, {});

      expect(result.data).toHaveLength(1);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.hasMore).toBe(false);
    });

    test('FR-021: filters by repId, month, year, and status', async () => {
      commissionStatement.findMany.mockResolvedValue([]);
      commissionStatement.count.mockResolvedValue(0);

      await listStatements(prisma, TENANT_ID, {
        repId: REP_ID,
        month: 2,
        year: 2026,
        status: 'pending',
      });

      expect(commissionStatement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            repId: REP_ID,
            month: 2,
            year: 2026,
            status: 'pending',
          }),
        }),
      );
    });

    test('FR-021: reports hasMore when results exceed limit', async () => {
      const manyStatements = Array.from({ length: 3 }, (_, i) =>
        createMockStatement({ id: `stmt-${i}` }),
      );
      commissionStatement.findMany.mockResolvedValue(manyStatements);
      commissionStatement.count.mockResolvedValue(5);

      const result = await listStatements(prisma, TENANT_ID, { limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.cursor).toBe('stmt-1');
    });
  });

  describe('approveStatement', () => {
    test('FR-021: approves pending statement with no open disputes', async () => {
      commissionStatement.findFirst.mockResolvedValue(
        createMockStatement({ disputes: [] }),
      );

      const approvedStatement = createMockStatement({
        status: 'approved',
        approvedBy: APPROVER_ID,
        approvedAt: NOW,
      });
      commissionStatement.update.mockResolvedValue(approvedStatement);

      const result = await approveStatement(
        prisma,
        TENANT_ID,
        STATEMENT_ID,
        APPROVER_ID,
        NOW.toISOString(),
        AUDIT_CTX,
      );

      expect(result.status).toBe('approved');
      expect(commissionStatement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'approved',
            approvedBy: APPROVER_ID,
          }),
        }),
      );
      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'CommissionStatement',
          action: 'update',
          changeSummary: expect.objectContaining({
            action: 'approve',
            newStatus: 'approved',
          }),
        }),
      );
    });

    test('FR-021: blocks approval when open disputes exist', async () => {
      const openDispute = {
        id: '00000000-0000-4000-a000-000000000100',
        status: 'open',
      } as CommissionDispute;

      commissionStatement.findFirst.mockResolvedValue(
        createMockStatement({ disputes: [openDispute] }),
      );

      await expect(
        approveStatement(prisma, TENANT_ID, STATEMENT_ID, APPROVER_ID, undefined, AUDIT_CTX),
      ).rejects.toThrow('Cannot approve statement with 1 open dispute(s)');
    });

    test('FR-021: rejects approval for non-pending statement', async () => {
      commissionStatement.findFirst.mockResolvedValue(
        createMockStatement({ status: 'approved', disputes: [] }),
      );

      await expect(
        approveStatement(prisma, TENANT_ID, STATEMENT_ID, APPROVER_ID, undefined, AUDIT_CTX),
      ).rejects.toThrow(CommissionStatementError);
    });

    test('FR-021: rejects with conflict on version mismatch (optimistic concurrency)', async () => {
      commissionStatement.findFirst.mockResolvedValue(
        createMockStatement({
          updatedAt: new Date('2026-03-01T12:00:00.000Z'),
          disputes: [],
        }),
      );

      await expect(
        approveStatement(
          prisma,
          TENANT_ID,
          STATEMENT_ID,
          APPROVER_ID,
          '2026-02-28T00:00:00.000Z', // stale
          AUDIT_CTX,
        ),
      ).rejects.toThrow('Statement has been modified by another user');
    });

    test('FR-021: throws NOT_FOUND for nonexistent statement', async () => {
      commissionStatement.findFirst.mockResolvedValue(null);

      await expect(
        approveStatement(prisma, TENANT_ID, 'nonexistent', APPROVER_ID, undefined, AUDIT_CTX),
      ).rejects.toThrow(CommissionStatementError);
    });
  });

  describe('rejectStatement', () => {
    test('FR-021: rejects pending statement with reason logged in audit trail', async () => {
      const statement = createMockStatement();
      commissionStatement.findFirst.mockResolvedValue(statement);

      const result = await rejectStatement(
        prisma,
        TENANT_ID,
        STATEMENT_ID,
        'Missing entries for order #1234',
        AUDIT_CTX,
      );

      expect(result).toBeDefined();
      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'CommissionStatement',
          action: 'update',
          changeSummary: expect.objectContaining({
            action: 'reject',
            reason: 'Missing entries for order #1234',
          }),
        }),
      );
    });

    test('FR-021: rejects non-pending statement throws error', async () => {
      commissionStatement.findFirst.mockResolvedValue(
        createMockStatement({ status: 'approved' }),
      );

      await expect(
        rejectStatement(prisma, TENANT_ID, STATEMENT_ID, 'Some reason', AUDIT_CTX),
      ).rejects.toThrow(CommissionStatementError);
    });
  });

  describe('formatStatementResponse', () => {
    test('FR-021: formats statement with all fields', () => {
      const statement = createMockStatement({
        entries: [createMockEntry()],
      });

      const response = formatStatementResponse(statement as never);

      expect(response['id']).toBe(STATEMENT_ID);
      expect(response['repName']).toBe('Jane Smith');
      expect(response['totalEarned']).toBe(1200);
      expect(response['ytdTotal']).toBe(3500);
      expect(response['entryCount']).toBe(1);
      expect(response['disputeCount']).toBe(0);
      expect(response['openDisputeCount']).toBe(0);
    });
  });
});
