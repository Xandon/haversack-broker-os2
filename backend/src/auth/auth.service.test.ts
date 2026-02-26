import { describe, it, expect, beforeEach } from 'vitest';
import { login, refresh, logout, AuthError } from './auth.service';
import { createMockPrisma, type MockPrismaClient } from '../shared/test-helpers/db';
import { hashPassword } from '../shared/services/password.service';
import { signRefreshToken } from '../shared/services/jwt.service';
import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

describe('FR-F001: Auth service', () => {
  let mockPrisma: MockPrismaClient;

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    tenantId: '00000000-0000-4000-a000-000000000001',
    email: 'rep@haversack.test',
    passwordHash: '', // Set in beforeEach
    firstName: 'Test',
    lastName: 'Rep',
    role: 'rep',
    isActive: true,
    deletedAt: null,
  };

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    mockUser.passwordHash = await hashPassword('TestPassword123!');
  });

  describe('login', () => {
    it('US2-AC1: returns tokens and user data for valid credentials', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'token-id' });
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await login(
        mockPrisma as unknown as PrismaClient,
        'rep@haversack.test',
        'TestPassword123!',
      );

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user.role).toBe('rep');
      expect(result.user.firstName).toBe('Test');
      expect(result.user.lastName).toBe('Rep');
    });

    it('US2-AC2: throws for invalid password', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(
        login(
          mockPrisma as unknown as PrismaClient,
          'rep@haversack.test',
          'WrongPassword!',
        ),
      ).rejects.toThrow(AuthError);
    });

    it('US2-AC2: throws for nonexistent user without revealing existence', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        login(
          mockPrisma as unknown as PrismaClient,
          'nobody@haversack.test',
          'TestPassword123!',
        ),
      ).rejects.toThrow('Invalid email or password');
    });

    it('FR-F001: throws for inactive user with same message', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        login(
          mockPrisma as unknown as PrismaClient,
          'rep@haversack.test',
          'TestPassword123!',
        ),
      ).rejects.toThrow('Invalid email or password');
    });

    it('US2-AC1: stores refresh token hash in database', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'token-id' });
      mockPrisma.user.update.mockResolvedValue(mockUser);

      await login(
        mockPrisma as unknown as PrismaClient,
        'rep@haversack.test',
        'TestPassword123!',
      );

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledOnce();
      const createCall = mockPrisma.refreshToken.create.mock.calls[0]?.[0];
      expect(createCall?.data?.tokenHash).toBeDefined();
      expect(createCall?.data?.userId).toBe(mockUser.id);
    });

    it('US2-AC1: updates lastLoginAt on successful login', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'token-id' });
      mockPrisma.user.update.mockResolvedValue(mockUser);

      await login(
        mockPrisma as unknown as PrismaClient,
        'rep@haversack.test',
        'TestPassword123!',
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('refresh', () => {
    it('US2-AC3: returns new tokens for valid refresh token', async () => {
      const payload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: 'rep' as const,
        tenantId: mockUser.tenantId,
      };
      const refreshTokenValue = signRefreshToken(payload);
      const tokenHash = createHash('sha256')
        .update(refreshTokenValue)
        .digest('hex');

      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-id',
        tokenHash,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'new-token-id' });

      const result = await refresh(
        mockPrisma as unknown as PrismaClient,
        refreshTokenValue,
      );

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('US2-AC4: throws for revoked refresh token', async () => {
      const payload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: 'rep' as const,
        tenantId: mockUser.tenantId,
      };
      const refreshTokenValue = signRefreshToken(payload);
      const tokenHash = createHash('sha256')
        .update(refreshTokenValue)
        .digest('hex');

      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-id',
        tokenHash,
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(
        refresh(mockPrisma as unknown as PrismaClient, refreshTokenValue),
      ).rejects.toThrow('Refresh token expired');
    });
  });

  describe('logout', () => {
    it('US2-AC6: revokes all refresh tokens for user', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await logout(
        mockPrisma as unknown as PrismaClient,
        mockUser.id,
      );

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
        },
      });
    });
  });
});
