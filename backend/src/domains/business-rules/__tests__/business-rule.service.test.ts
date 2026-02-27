import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  createRule,
  getRuleById,
  listRules,
  updateRule,
  deleteRule,
} from '../business-rule.service';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const USER_ID = '00000000-0000-4000-a000-000000000010';
const RULE_ID = '00000000-0000-4000-a000-000000000100';

const AUDIT = {
  actorId: USER_ID,
  actorEmail: 'admin@haversack.test',
};

function createMockPrisma(): {
  prisma: PrismaClient;
  mocks: Record<string, Record<string, ReturnType<typeof vi.fn>>>;
} {
  const businessRule = {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };
  const auditLog = { create: vi.fn() };

  return {
    prisma: { businessRule, auditLog } as unknown as PrismaClient,
    mocks: { businessRule, auditLog },
  };
}

const VALID_INPUT = {
  name: 'Churn Alert',
  description: 'Alert when account health drops',
  entityType: 'Account',
  conditions: {
    logic: 'AND' as const,
    conditions: [
      { field: 'healthScore', operator: 'lt', value: 30 },
    ],
  },
  actions: [
    { type: 'send_notification' as const, config: { recipient: 'assignedRep', title: 'Churn Alert' } },
  ],
};

describe('FR-028: Business rule CRUD service', () => {
  let prisma: PrismaClient;
  let mocks: Record<string, Record<string, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockPrisma();
    prisma = mock.prisma;
    mocks = mock.mocks;
  });

  describe('createRule', () => {
    test('FR-028: creates a rule with valid conditions and actions', async () => {
      mocks['businessRule']!['create']!.mockResolvedValue({
        id: RULE_ID,
        tenantId: TENANT_ID,
        ...VALID_INPUT,
        priority: 100,
        status: 'active',
        createdBy: USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await createRule(prisma, TENANT_ID, USER_ID, VALID_INPUT, AUDIT);

      expect(result['id']).toBe(RULE_ID);
      expect(result['name']).toBe('Churn Alert');
      expect(mocks['businessRule']!['create']).toHaveBeenCalledTimes(1);
      expect(mocks['auditLog']!['create']).toHaveBeenCalledTimes(1);
    });

    test('AC-028b: rejects rule with invalid conditions', async () => {
      const invalidInput = {
        ...VALID_INPUT,
        conditions: {
          logic: 'AND' as const,
          conditions: [
            { field: 'nonExistentField', operator: 'eq', value: 'test' },
          ],
        },
      };

      await expect(
        createRule(prisma, TENANT_ID, USER_ID, invalidInput, AUDIT),
      ).rejects.toThrow("Field 'Account.nonExistentField' does not exist");
    });

    test('FR-028: rejects rule with no actions', async () => {
      const noActions = { ...VALID_INPUT, actions: [] };

      await expect(
        createRule(prisma, TENANT_ID, USER_ID, noActions, AUDIT),
      ).rejects.toThrow('At least one action is required');
    });
  });

  describe('getRuleById', () => {
    test('FR-028: returns rule with creator info', async () => {
      mocks['businessRule']!['findFirst']!.mockResolvedValue({
        id: RULE_ID,
        tenantId: TENANT_ID,
        name: 'Churn Alert',
        creator: { id: USER_ID, firstName: 'Admin', lastName: 'User' },
      });

      const result = await getRuleById(prisma, TENANT_ID, RULE_ID);
      expect(result['id']).toBe(RULE_ID);
    });

    test('FR-028: throws for non-existent rule', async () => {
      mocks['businessRule']!['findFirst']!.mockResolvedValue(null);

      await expect(
        getRuleById(prisma, TENANT_ID, 'non-existent'),
      ).rejects.toThrow('Business rule not found');
    });
  });

  describe('listRules', () => {
    test('FR-028: returns list with total count', async () => {
      mocks['businessRule']!['findMany']!.mockResolvedValue([
        { id: RULE_ID, name: 'Churn Alert', status: 'active' },
      ]);
      mocks['businessRule']!['count']!.mockResolvedValue(1);

      const result = await listRules(prisma, TENANT_ID);
      expect(result.rules).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    test('FR-028: filters by status and entityType', async () => {
      mocks['businessRule']!['findMany']!.mockResolvedValue([]);
      mocks['businessRule']!['count']!.mockResolvedValue(0);

      await listRules(prisma, TENANT_ID, { status: 'active', entityType: 'Account' });

      expect(mocks['businessRule']!['findMany']).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            status: 'active',
            entityType: 'Account',
          }),
        }),
      );
    });
  });

  describe('updateRule', () => {
    test('FR-028: updates rule name and priority', async () => {
      mocks['businessRule']!['findFirst']!.mockResolvedValue({
        id: RULE_ID,
        tenantId: TENANT_ID,
        entityType: 'Account',
      });
      mocks['businessRule']!['update']!.mockResolvedValue({
        id: RULE_ID,
        name: 'Updated Name',
        priority: 50,
      });

      const result = await updateRule(
        prisma,
        TENANT_ID,
        RULE_ID,
        { name: 'Updated Name', priority: 50 },
        AUDIT,
      );

      expect(result['name']).toBe('Updated Name');
      expect(mocks['auditLog']!['create']).toHaveBeenCalledTimes(1);
    });

    test('FR-028: throws for non-existent rule', async () => {
      mocks['businessRule']!['findFirst']!.mockResolvedValue(null);

      await expect(
        updateRule(prisma, TENANT_ID, 'non-existent', { name: 'test' }, AUDIT),
      ).rejects.toThrow('Business rule not found');
    });

    test('FR-028: validates updated conditions', async () => {
      mocks['businessRule']!['findFirst']!.mockResolvedValue({
        id: RULE_ID,
        tenantId: TENANT_ID,
        entityType: 'Account',
      });

      await expect(
        updateRule(
          prisma,
          TENANT_ID,
          RULE_ID,
          { conditions: { logic: 'AND', conditions: [{ field: 'badField', operator: 'eq', value: 1 }] } },
          AUDIT,
        ),
      ).rejects.toThrow("Field 'Account.badField' does not exist");
    });
  });

  describe('deleteRule', () => {
    test('FR-028: deletes rule and creates audit log', async () => {
      mocks['businessRule']!['findFirst']!.mockResolvedValue({
        id: RULE_ID,
        tenantId: TENANT_ID,
        name: 'Churn Alert',
      });
      mocks['businessRule']!['delete']!.mockResolvedValue({});

      await deleteRule(prisma, TENANT_ID, RULE_ID, AUDIT);

      expect(mocks['businessRule']!['delete']).toHaveBeenCalledWith({ where: { id: RULE_ID } });
      expect(mocks['auditLog']!['create']).toHaveBeenCalledTimes(1);
    });

    test('FR-028: throws for non-existent rule', async () => {
      mocks['businessRule']!['findFirst']!.mockResolvedValue(null);

      await expect(
        deleteRule(prisma, TENANT_ID, 'non-existent', AUDIT),
      ).rejects.toThrow('Business rule not found');
    });
  });
});
