import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  createTestPrisma,
  disconnectTestPrisma,
  cleanDatabase,
  seedTestData,
  type TestSeedData,
} from '../shared/test-helpers/integration-db';
import { login } from './auth.service';

describe('Integration: Auth service against real PostgreSQL', () => {
  let prisma: PrismaClient;
  let seed: TestSeedData;

  beforeAll(async () => {
    prisma = createTestPrisma();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    seed = await seedTestData(prisma);
  });

  describe('login', () => {
    test('FR-002: successful login returns tokens and user data', async () => {
      const result = await login(prisma, seed.repUser.email, 'TestPass123!');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe(seed.repUser.id);
      expect(result.user.email).toBe(seed.repUser.email);
      expect(result.user.role).toBe('rep');
      expect(result.user.firstName).toBe('Sales');
      expect(result.user.lastName).toBe('Rep');
    });

    test('FR-002: login stores refresh token hash in database', async () => {
      const result = await login(prisma, seed.repUser.email, 'TestPass123!');

      const storedToken = await prisma.refreshToken.findFirst({
        where: { userId: seed.repUser.id },
      });

      expect(storedToken).not.toBeNull();
      expect(storedToken!.isRevoked).toBe(false);
      // Token hash should not equal the raw token
      expect(storedToken!.tokenHash).not.toBe(result.refreshToken);
    });

    test('FR-002: login fails with wrong password', async () => {
      await expect(
        login(prisma, seed.repUser.email, 'WrongPassword123!'),
      ).rejects.toThrow('Invalid email or password');
    });

    test('FR-002: login fails with non-existent email', async () => {
      await expect(
        login(prisma, 'nobody@haversack.test', 'TestPass123!'),
      ).rejects.toThrow('Invalid email or password');
    });

    test('FR-002: login fails for inactive user', async () => {
      await prisma.user.update({
        where: { id: seed.repUser.id },
        data: { isActive: false },
      });

      await expect(
        login(prisma, seed.repUser.email, 'TestPass123!'),
      ).rejects.toThrow('Invalid email or password');
    });

    test('FR-002: admin user can log in', async () => {
      const result = await login(prisma, seed.adminUser.email, 'TestPass123!');

      expect(result.user.role).toBe('admin');
      expect(result.accessToken).toBeDefined();
    });

    test('FR-002: manager user can log in', async () => {
      const result = await login(prisma, seed.managerUser.email, 'TestPass123!');

      expect(result.user.role).toBe('manager');
      expect(result.accessToken).toBeDefined();
    });
  });
});
