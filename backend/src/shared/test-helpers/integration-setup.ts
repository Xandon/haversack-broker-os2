import { PrismaClient } from '@prisma/client';

const TEST_DATABASE_URL = process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/haversack_test';

export async function setup(): Promise<void> {
  process.env['DATABASE_URL'] = TEST_DATABASE_URL;

  const prisma = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });

  try {
    await prisma.$connect();
    // Verify connection works
    await prisma.$queryRaw`SELECT 1`;
    console.log('[integration-setup] Database connection verified');
  } catch (error) {
    console.error('[integration-setup] Database connection failed. Ensure PostgreSQL is running.');
    console.error('[integration-setup] Run: npm run docker:up');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export async function teardown(): Promise<void> {
  // No-op — individual tests handle their own cleanup
}
