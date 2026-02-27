import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../services/password.service';

const TEST_DATABASE_URL = process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/haversack_test';

let sharedPrisma: PrismaClient | null = null;

export function createTestPrisma(): PrismaClient {
  if (!sharedPrisma) {
    sharedPrisma = new PrismaClient({
      datasourceUrl: TEST_DATABASE_URL,
      log: [],
    });
  }
  return sharedPrisma;
}

export async function disconnectTestPrisma(): Promise<void> {
  if (sharedPrisma) {
    await sharedPrisma.$disconnect();
    sharedPrisma = null;
  }
}

/**
 * Cleans all data from the database in the correct order to respect foreign keys.
 * Used between tests to ensure isolation.
 */
export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  // Delete in reverse dependency order
  await prisma.$executeRawUnsafe('DELETE FROM "commission_disputes"');
  await prisma.$executeRawUnsafe('DELETE FROM "commission_entries"');
  await prisma.$executeRawUnsafe('DELETE FROM "commission_exports"');
  await prisma.$executeRawUnsafe('DELETE FROM "commission_statements"');
  await prisma.$executeRawUnsafe('DELETE FROM "commission_rules"');
  await prisma.$executeRawUnsafe('DELETE FROM "order_approvals"');
  await prisma.$executeRawUnsafe('DELETE FROM "quickbooks_exports"');
  await prisma.$executeRawUnsafe('DELETE FROM "order_line_items"');
  await prisma.$executeRawUnsafe('DELETE FROM "vendor_sub_orders"');
  await prisma.$executeRawUnsafe('DELETE FROM "orders"');
  await prisma.$executeRawUnsafe('DELETE FROM "opportunity_brands"');
  await prisma.$executeRawUnsafe('DELETE FROM "opportunities"');
  await prisma.$executeRawUnsafe('DELETE FROM "demos"');
  await prisma.$executeRawUnsafe('DELETE FROM "activities"');
  await prisma.$executeRawUnsafe('DELETE FROM "task_reminders"');
  await prisma.$executeRawUnsafe('DELETE FROM "tasks"');
  await prisma.$executeRawUnsafe('DELETE FROM "contacts"');
  await prisma.$executeRawUnsafe('DELETE FROM "account_health_scores"');
  await prisma.$executeRawUnsafe('DELETE FROM "email_records"');
  await prisma.$executeRawUnsafe('DELETE FROM "notifications"');
  await prisma.$executeRawUnsafe('DELETE FROM "data_quality_scores"');
  await prisma.$executeRawUnsafe('DELETE FROM "data_imports"');
  await prisma.$executeRawUnsafe('DELETE FROM "saved_reports"');
  await prisma.$executeRawUnsafe('DELETE FROM "products"');
  await prisma.$executeRawUnsafe('DELETE FROM "accounts"');
  await prisma.$executeRawUnsafe('DELETE FROM "brands"');
  await prisma.$executeRawUnsafe('DELETE FROM "user_territories"');
  await prisma.$executeRawUnsafe('DELETE FROM "refresh_tokens"');
  await prisma.$executeRawUnsafe('DELETE FROM "audit_logs"');
  await prisma.$executeRawUnsafe('DELETE FROM "users"');
  await prisma.$executeRawUnsafe('DELETE FROM "territories"');
}

export interface TestSeedData {
  tenantId: string;
  territory: { id: string; name: string };
  adminUser: { id: string; email: string };
  repUser: { id: string; email: string };
  managerUser: { id: string; email: string };
  brand: { id: string; name: string };
  account: { id: string; name: string };
  product: { id: string; name: string; sku: string };
}

/**
 * Seeds the database with a minimal set of data for integration tests.
 * Returns references to all created records.
 */
export async function seedTestData(prisma: PrismaClient): Promise<TestSeedData> {
  const tenantId = '00000000-0000-4000-a000-000000000001';
  const password = await hashPassword('TestPass123!');

  // Territory
  const territory = await prisma.territory.create({
    data: {
      tenantId,
      name: 'Portland Metro',
      region: 'Pacific Northwest',
    },
  });

  // Admin user
  const adminUser = await prisma.user.create({
    data: {
      tenantId,
      email: 'admin@haversack.test',
      passwordHash: password,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
    },
  });

  // Manager user
  const managerUser = await prisma.user.create({
    data: {
      tenantId,
      email: 'manager@haversack.test',
      passwordHash: password,
      firstName: 'Manager',
      lastName: 'User',
      role: 'manager',
      isActive: true,
    },
  });

  // Rep user
  const repUser = await prisma.user.create({
    data: {
      tenantId,
      email: 'rep@haversack.test',
      passwordHash: password,
      firstName: 'Sales',
      lastName: 'Rep',
      role: 'rep',
      isActive: true,
    },
  });

  // Assign rep to territory
  await prisma.userTerritory.create({
    data: {
      userId: repUser.id,
      territoryId: territory.id,
    },
  });

  // Brand
  const brand = await prisma.brand.create({
    data: {
      tenantId,
      name: 'Artisan Cheese Co',
      contactName: 'Test Contact',
      contactEmail: 'brand@test.com',
    },
  });

  // Account
  const account = await prisma.account.create({
    data: {
      tenantId,
      name: 'Portland Grocery',
      accountType: 'retail',
      territoryId: territory.id,
      assignedRepId: repUser.id,
    },
  });

  // Product
  const product = await prisma.product.create({
    data: {
      tenantId,
      brandId: brand.id,
      name: 'Aged Cheddar',
      sku: 'TEST-CHED-001',
      unitPrice: 12.99,
      revenueModelDefault: 'broker',
      availabilityStatus: 'active',
    },
  });

  return {
    tenantId,
    territory: { id: territory.id, name: territory.name },
    adminUser: { id: adminUser.id, email: adminUser.email },
    repUser: { id: repUser.id, email: repUser.email },
    managerUser: { id: managerUser.id, email: managerUser.email },
    brand: { id: brand.id, name: brand.name },
    account: { id: account.id, name: account.name },
    product: { id: product.id, name: product.name, sku: product.sku },
  };
}
