import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  fileDispute,
  resolveDispute,
  formatDisputeResponse,
  CommissionDisputeError,
} from './commission-dispute.service';
import type { AuditContext } from './commission-rule.service';
import type { PrismaClient, CommissionEntry, CommissionDispute } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const { mockWriteAuditLog } = vi.hoisted(() => ({
  mockWriteAuditLog: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../shared/services/audit.service', () => ({
  writeAuditLog: mockWriteAuditLog,
}));

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const REP_ID = '00000000-0000-4000-a000-000000000020';
const MANAGER_ID = '00000000-0000-4000-a000-000000000010';
const ENTRY_ID = '00000000-0000-4000-a000-000000000090';
const STATEMENT_ID = '00000000-0000-4000-a000-000000000080';
const DISPUTE_ID = '00000000-0000-4000-a000-000000000100';

const AUDIT_CTX: AuditContext = {
  actorId: REP_ID,
  actorEmail: 'jane@haversack.com',
  ipAddress: '127.0.0.1',
  requestId: 'req-789',
};

const MANAGER_AUDIT_CTX: AuditContext = {
  actorId: MANAGER_ID,
  actorEmail: 'manager@haversack.com',
  ipAddress: '127.0.0.1',
  requestId: 'req-790',
};

const NOW = new Date('2026-03-01T00:00:00.000Z');

function createMockEntry(overrides: Partial<CommissionEntry> = {}): CommissionEntry {
  return {
    id: ENTRY_ID,
    tenantId: TENANT_ID,
    orderId: '00000000-0000-4000-a000-000000000070',
    orderLineItemId: '00000000-0000-4000-a000-000000000071',
    repId: REP_ID,
    commissionRuleId: '00000000-0000-4000-a000-000000000060',
    statementId: STATEMENT_ID,
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

function createMockDispute(overrides: Partial<CommissionDispute> = {}): CommissionDispute & {
  commissionEntry: { id: string; orderId: string; commissionAmount: Decimal; statementId: string | null };
  filer: { id: string; firstName: string; lastName: string };
  resolver: { id: string; firstName: string; lastName: string } | null;
} {
  return {
    id: DISPUTE_ID,
    tenantId: TENANT_ID,
    statementId: STATEMENT_ID,
    commissionEntryId: ENTRY_ID,
    filedBy: REP_ID,
    reason: 'Incorrect commission rate applied',
    status: 'open',
    originalAmount: new Decimal('500.00'),
    adjustedAmount: null,
    resolvedBy: null,
    resolvedAt: null,
    resolutionNotes: null,
    createdAt: NOW,
    updatedAt: NOW,
    commissionEntry: {
      id: ENTRY_ID,
      orderId: '00000000-0000-4000-a000-000000000070',
      commissionAmount: new Decimal('500.00'),
      statementId: STATEMENT_ID,
    },
    filer: { id: REP_ID, firstName: 'Jane', lastName: 'Smith' },
    resolver: null,
    ...overrides,
  } as CommissionDispute & {
    commissionEntry: { id: string; orderId: string; commissionAmount: Decimal; statementId: string | null };
    filer: { id: string; firstName: string; lastName: string };
    resolver: { id: string; firstName: string; lastName: string } | null;
  };
}

interface MockPrismaResult {
  prisma: PrismaClient;
  commissionEntry: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  commissionDispute: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  commissionStatement: {
    update: ReturnType<typeof vi.fn>;
  };
}

function createMockPrisma(): MockPrismaResult {
  const commissionEntry = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  };

  const commissionDispute = {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const commissionStatement = {
    update: vi.fn(),
  };

  const prisma = {
    commissionEntry,
    commissionDispute,
    commissionStatement,
    $transaction: vi.fn().mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ commissionEntry, commissionDispute, commissionStatement }),
    ),
  } as unknown as PrismaClient;

  return { prisma, commissionEntry, commissionDispute, commissionStatement };
}

describe('FR-021: Commission dispute service', () => {
  let prisma: PrismaClient;
  let commissionEntry: MockPrismaResult['commissionEntry'];
  let commissionDispute: MockPrismaResult['commissionDispute'];
  let commissionStatement: MockPrismaResult['commissionStatement'];

  beforeEach(() => {
    vi.clearAllMocks();
    const mocks = createMockPrisma();
    prisma = mocks.prisma;
    commissionEntry = mocks.commissionEntry;
    commissionDispute = mocks.commissionDispute;
    commissionStatement = mocks.commissionStatement;
  });

  describe('fileDispute', () => {
    test('FR-021: files a dispute on a commission entry', async () => {
      const entry = createMockEntry();
      commissionEntry.findFirst.mockResolvedValue(entry);
      commissionDispute.findFirst.mockResolvedValue(null); // no existing dispute
      commissionDispute.create.mockResolvedValue(createMockDispute());

      const result = await fileDispute(
        prisma,
        TENANT_ID,
        ENTRY_ID,
        'Incorrect commission rate applied',
        REP_ID,
        AUDIT_CTX,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(DISPUTE_ID);
      expect(commissionDispute.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            statementId: STATEMENT_ID,
            commissionEntryId: ENTRY_ID,
            filedBy: REP_ID,
            reason: 'Incorrect commission rate applied',
            originalAmount: entry.commissionAmount,
          }),
        }),
      );
      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'CommissionDispute',
          action: 'create',
          changeSummary: expect.objectContaining({
            entryId: ENTRY_ID,
            reason: 'Incorrect commission rate applied',
          }),
        }),
      );
    });

    test('FR-021: rejects duplicate dispute on same entry', async () => {
      const entry = createMockEntry();
      commissionEntry.findFirst.mockResolvedValue(entry);
      commissionDispute.findFirst.mockResolvedValue(createMockDispute()); // existing dispute

      await expect(
        fileDispute(prisma, TENANT_ID, ENTRY_ID, 'Duplicate dispute', REP_ID, AUDIT_CTX),
      ).rejects.toThrow('A dispute already exists for this commission entry');
    });

    test('FR-021: rejects dispute for nonexistent entry', async () => {
      commissionEntry.findFirst.mockResolvedValue(null);

      await expect(
        fileDispute(prisma, TENANT_ID, 'nonexistent', 'Some reason', REP_ID, AUDIT_CTX),
      ).rejects.toThrow(CommissionDisputeError);
    });

    test('FR-021: rejects dispute for entry not attached to a statement', async () => {
      const unlinkedEntry = createMockEntry({ statementId: null });
      commissionEntry.findFirst.mockResolvedValue(unlinkedEntry);

      await expect(
        fileDispute(prisma, TENANT_ID, ENTRY_ID, 'Some reason', REP_ID, AUDIT_CTX),
      ).rejects.toThrow('Commission entry is not attached to a statement');
    });
  });

  describe('resolveDispute', () => {
    test('FR-021: resolves dispute with amount adjustment and recalculates statement', async () => {
      const dispute = createMockDispute();
      commissionDispute.findFirst.mockResolvedValue(dispute);
      commissionDispute.update.mockResolvedValue(
        createMockDispute({
          status: 'resolved',
          adjustedAmount: new Decimal('400.00'),
          resolvedBy: MANAGER_ID,
          resolvedAt: NOW,
          resolutionNotes: 'Rate adjusted per territory override',
        }),
      );
      commissionEntry.update.mockResolvedValue({});

      // After adjustment, statement entries return updated amounts
      commissionEntry.findMany.mockResolvedValue([
        { commissionAmount: new Decimal('400.00') },
        { commissionAmount: new Decimal('300.00') },
      ]);
      commissionStatement.update.mockResolvedValue({});

      const result = await resolveDispute(
        prisma,
        TENANT_ID,
        DISPUTE_ID,
        {
          resolution: 'accepted',
          adjustedAmount: 400,
          resolutionNotes: 'Rate adjusted per territory override',
        },
        MANAGER_ID,
        MANAGER_AUDIT_CTX,
      );

      expect(result).toBeDefined();
      expect(commissionDispute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'resolved',
            adjustedAmount: new Decimal('400.00'),
            resolvedBy: MANAGER_ID,
            resolutionNotes: 'Rate adjusted per territory override',
          }),
        }),
      );

      // Verify entry was updated with new amount
      expect(commissionEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ENTRY_ID },
          data: { commissionAmount: new Decimal('400.00') },
        }),
      );

      // Verify statement total was recalculated
      expect(commissionStatement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: STATEMENT_ID },
          data: { totalEarned: new Decimal('700.00') },
        }),
      );

      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'CommissionDispute',
          action: 'update',
          changeSummary: expect.objectContaining({
            resolution: 'accepted',
            adjustedAmount: 400,
          }),
        }),
      );
    });

    test('FR-021: resolves dispute without adjustment (rejected)', async () => {
      const dispute = createMockDispute();
      commissionDispute.findFirst.mockResolvedValue(dispute);
      commissionDispute.update.mockResolvedValue(
        createMockDispute({
          status: 'resolved',
          resolvedBy: MANAGER_ID,
          resolvedAt: NOW,
          resolutionNotes: 'Rate is correct per current rule',
        }),
      );

      const result = await resolveDispute(
        prisma,
        TENANT_ID,
        DISPUTE_ID,
        {
          resolution: 'rejected',
          resolutionNotes: 'Rate is correct per current rule',
        },
        MANAGER_ID,
        MANAGER_AUDIT_CTX,
      );

      expect(result).toBeDefined();
      // Should NOT update the commission entry or recalculate statement
      expect(commissionEntry.update).not.toHaveBeenCalled();
      expect(commissionStatement.update).not.toHaveBeenCalled();
    });

    test('FR-021: throws NOT_FOUND for nonexistent dispute', async () => {
      commissionDispute.findFirst.mockResolvedValue(null);

      await expect(
        resolveDispute(
          prisma,
          TENANT_ID,
          'nonexistent',
          { resolution: 'rejected', resolutionNotes: 'N/A' },
          MANAGER_ID,
          MANAGER_AUDIT_CTX,
        ),
      ).rejects.toThrow(CommissionDisputeError);
    });

    test('FR-021: throws error for already-resolved dispute', async () => {
      commissionDispute.findFirst.mockResolvedValue(
        createMockDispute({ status: 'resolved' }),
      );

      await expect(
        resolveDispute(
          prisma,
          TENANT_ID,
          DISPUTE_ID,
          { resolution: 'rejected', resolutionNotes: 'N/A' },
          MANAGER_ID,
          MANAGER_AUDIT_CTX,
        ),
      ).rejects.toThrow('Dispute has already been resolved');
    });
  });

  describe('formatDisputeResponse', () => {
    test('FR-021: formats dispute with all fields', () => {
      const dispute = createMockDispute();
      const response = formatDisputeResponse(dispute as never);

      expect(response['id']).toBe(DISPUTE_ID);
      expect(response['filerName']).toBe('Jane Smith');
      expect(response['originalAmount']).toBe(500);
      expect(response['adjustedAmount']).toBeNull();
      expect(response['status']).toBe('open');
    });
  });
});
