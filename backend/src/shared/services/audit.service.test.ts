import { describe, it, expect, beforeEach } from 'vitest';
import { writeAuditLog, detectChanges, writeUpdateAuditLogs } from './audit.service';
import { createMockPrisma, type MockPrismaClient } from '../test-helpers/db';
import type { PrismaClient } from '@prisma/client';

describe('FR-F008: Audit trail service', () => {
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  describe('writeAuditLog', () => {
    it('US5-AC1: creates audit log entry for CREATE operation', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

      await writeAuditLog({
        prisma: mockPrisma as unknown as PrismaClient,
        tenantId: '00000000-0000-4000-a000-000000000001',
        actorId: '550e8400-e29b-41d4-a716-446655440001',
        actorEmail: 'rep@haversack.test',
        entityType: 'Account',
        entityId: '550e8400-e29b-41d4-a716-446655440010',
        action: 'create',
        requestId: '550e8400-e29b-41d4-a716-446655440099',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledOnce();
      const createCall = mockPrisma.auditLog.create.mock.calls[0]?.[0];
      expect(createCall?.data?.action).toBe('create');
      expect(createCall?.data?.entityType).toBe('Account');
      expect(createCall?.data?.actorId).toBe(
        '550e8400-e29b-41d4-a716-446655440001',
      );
    });

    it('US5-AC2: creates audit log with field-level changes for UPDATE', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-2' });

      await writeAuditLog({
        prisma: mockPrisma as unknown as PrismaClient,
        tenantId: '00000000-0000-4000-a000-000000000001',
        actorId: '550e8400-e29b-41d4-a716-446655440001',
        actorEmail: 'manager@haversack.test',
        entityType: 'Account',
        entityId: '550e8400-e29b-41d4-a716-446655440010',
        action: 'update',
        fieldName: 'name',
        oldValue: 'Old Name',
        newValue: 'New Name',
      });

      const createCall = mockPrisma.auditLog.create.mock.calls[0]?.[0];
      expect(createCall?.data?.fieldName).toBe('name');
      expect(createCall?.data?.oldValue).toBe('Old Name');
      expect(createCall?.data?.newValue).toBe('New Name');
    });

    it('US5-AC3: creates audit log for DELETE operation', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-3' });

      await writeAuditLog({
        prisma: mockPrisma as unknown as PrismaClient,
        tenantId: '00000000-0000-4000-a000-000000000001',
        actorId: '550e8400-e29b-41d4-a716-446655440001',
        actorEmail: 'admin@haversack.test',
        entityType: 'User',
        entityId: '550e8400-e29b-41d4-a716-446655440020',
        action: 'delete',
      });

      const createCall = mockPrisma.auditLog.create.mock.calls[0]?.[0];
      expect(createCall?.data?.action).toBe('delete');
      expect(createCall?.data?.entityType).toBe('User');
    });
  });

  describe('detectChanges', () => {
    it('US5-AC6: detects multiple field changes', () => {
      const oldData = { name: 'Old Name', address: '123 Old St', active: true };
      const newData = {
        name: 'New Name',
        address: '456 New Ave',
        active: true,
      };

      const changes = detectChanges(oldData, newData);

      expect(changes).toHaveLength(2);
      expect(changes.find((c) => c.field === 'name')).toEqual({
        field: 'name',
        oldValue: 'Old Name',
        newValue: 'New Name',
      });
      expect(changes.find((c) => c.field === 'address')).toEqual({
        field: 'address',
        oldValue: '123 Old St',
        newValue: '456 New Ave',
      });
    });

    it('US5-AC6: returns empty array when no changes', () => {
      const data = { name: 'Same', active: true };
      const changes = detectChanges(data, data);
      expect(changes).toHaveLength(0);
    });

    it('FR-F008: handles null values in changes', () => {
      const oldData = { notes: null };
      const newData = { notes: 'Added notes' };

      const changes = detectChanges(
        oldData as Record<string, unknown>,
        newData,
      );

      expect(changes).toHaveLength(1);
      expect(changes[0]?.oldValue).toBeNull();
      expect(changes[0]?.newValue).toBe('Added notes');
    });
  });

  describe('writeUpdateAuditLogs', () => {
    it('US5-AC6: writes one audit log per changed field', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-x' });

      const changes = [
        { field: 'name', oldValue: 'Old', newValue: 'New' },
        { field: 'address', oldValue: '123 St', newValue: '456 Ave' },
      ];

      await writeUpdateAuditLogs(
        {
          prisma: mockPrisma as unknown as PrismaClient,
          tenantId: '00000000-0000-4000-a000-000000000001',
          actorId: '550e8400-e29b-41d4-a716-446655440001',
          actorEmail: 'manager@haversack.test',
          entityType: 'Account',
          entityId: '550e8400-e29b-41d4-a716-446655440010',
        },
        changes,
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(2);
    });
  });
});
