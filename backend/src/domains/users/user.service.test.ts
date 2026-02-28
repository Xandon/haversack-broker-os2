import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createUserService } from './user.service.js';

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('$2b$12$hashedpassword'),
}));

function createMockPrisma() {
  return {
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe('UserService', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let service: ReturnType<typeof createUserService>;
  const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = createUserService(mockPrisma as any);
  });

  describe('list', () => {
    it('FR-026: returns active users with territory', async () => {
      const mockUsers = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          role: 'rep',
          territory: { name: 'Portland' },
        },
      ];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.list(TENANT_ID);

      expect(result).toEqual(mockUsers);
      const callArgs = mockPrisma.user.findMany.mock.calls[0][0];
      expect(callArgs.where.isActive).toBe(true);
      expect(callArgs.where.deletedAt).toBeNull();
    });

    it('FR-026: includes inactive users when requested', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.list(TENANT_ID, true);

      const callArgs = mockPrisma.user.findMany.mock.calls[0][0];
      expect(callArgs.where.isActive).toBeUndefined();
    });
  });

  describe('create', () => {
    it('FR-026: creates user with hashed password at cost 12', async () => {
      const input = {
        email: 'newrep@haversack.com',
        password: 'SecurePass123!',
        firstName: 'New',
        lastName: 'Rep',
        role: 'rep' as const,
      };
      mockPrisma.user.create.mockResolvedValue({ id: '1', ...input });

      await service.create(TENANT_ID, input);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            email: 'newrep@haversack.com',
            passwordHash: '$2b$12$hashedpassword',
          }),
        }),
      );
    });

    it('FR-026: does not store plaintext password', async () => {
      const input = {
        email: 'test@haversack.com',
        password: 'MyPassword',
        firstName: 'Test',
        lastName: 'User',
        role: 'viewer' as const,
      };
      mockPrisma.user.create.mockResolvedValue({ id: '1' });

      await service.create(TENANT_ID, input);

      const callArgs = mockPrisma.user.create.mock.calls[0][0];
      expect(callArgs.data.password).toBeUndefined();
      expect(callArgs.data.passwordHash).toBeDefined();
    });
  });

  describe('update', () => {
    it('FR-026: updates user fields', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: '1', role: 'manager' });

      await service.update(TENANT_ID, '1', { role: 'manager' });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: { role: 'manager' },
        }),
      );
    });
  });

  describe('deactivate', () => {
    it('FR-026: sets isActive to false', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: '1', isActive: false });

      await service.deactivate(TENANT_ID, '1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: { isActive: false },
        }),
      );
    });
  });

  describe('checkEmailUnique', () => {
    it('FR-026: returns true when email is unique', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await service.checkEmailUnique(TENANT_ID, 'new@haversack.com');
      expect(result).toBe(true);
    });

    it('FR-026: returns false when email exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: '1' });

      const result = await service.checkEmailUnique(TENANT_ID, 'existing@haversack.com');
      expect(result).toBe(false);
    });

    it('FR-026: excludes specific user ID from check', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await service.checkEmailUnique(TENANT_ID, 'test@haversack.com', 'user-1');

      const callArgs = mockPrisma.user.findFirst.mock.calls[0][0];
      expect(callArgs.where.id).toEqual({ not: 'user-1' });
    });
  });
});
