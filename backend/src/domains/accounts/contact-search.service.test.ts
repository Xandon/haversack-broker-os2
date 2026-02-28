import { describe, test, expect, vi, beforeEach } from 'vitest';
import { searchContacts } from './contact-search.service';
import type { PrismaClient } from '@prisma/client';

function createMockPrisma(): { $queryRawUnsafe: ReturnType<typeof vi.fn> } {
  return {
    $queryRawUnsafe: vi.fn(),
  };
}

describe('FR-032: Contact search service', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  const tenantId = 'tenant-001';

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  test('FR-032: returns matching contacts with account names', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([
      {
        id: 'contact-1',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@pacific.com',
        phone: '503-555-0123',
        account_id: 'account-1',
        account_name: 'Pacific Foods NW',
      },
    ]);

    const results = await searchContacts(mockPrisma as unknown as PrismaClient, tenantId, {
      query: 'jane',
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      id: 'contact-1',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@pacific.com',
      phone: '503-555-0123',
      accountId: 'account-1',
      accountName: 'Pacific Foods NW',
    });
  });

  test('FR-032: returns empty array when no contacts match', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

    const results = await searchContacts(mockPrisma as unknown as PrismaClient, tenantId, {
      query: 'nonexistent',
    });

    expect(results).toHaveLength(0);
  });

  test('FR-032: passes tenant_id for tenant isolation', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

    await searchContacts(mockPrisma as unknown as PrismaClient, tenantId, {
      query: 'test',
    });

    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('c.tenant_id = $1'),
      tenantId,
      '%test%',
      5,
    );
  });

  test('FR-032: uses ILIKE for case-insensitive search', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

    await searchContacts(mockPrisma as unknown as PrismaClient, tenantId, {
      query: 'Pacific',
    });

    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('ILIKE'),
      tenantId,
      '%Pacific%',
      5,
    );
  });

  test('FR-032: respects limit parameter', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

    await searchContacts(mockPrisma as unknown as PrismaClient, tenantId, {
      query: 'test',
      limit: 10,
    });

    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.any(String),
      tenantId,
      '%test%',
      10,
    );
  });

  test('FR-032: defaults limit to 5', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

    await searchContacts(mockPrisma as unknown as PrismaClient, tenantId, {
      query: 'test',
    });

    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.any(String),
      tenantId,
      '%test%',
      5,
    );
  });

  test('FR-032: searches across first_name, last_name, email, phone', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

    await searchContacts(mockPrisma as unknown as PrismaClient, tenantId, {
      query: 'test',
    });

    const sql = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
    expect(sql).toContain('c.first_name ILIKE');
    expect(sql).toContain('c.last_name ILIKE');
    expect(sql).toContain('c.email ILIKE');
    expect(sql).toContain('c.phone ILIKE');
  });

  test('FR-032: excludes deleted contacts', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

    await searchContacts(mockPrisma as unknown as PrismaClient, tenantId, {
      query: 'test',
    });

    const sql = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
    expect(sql).toContain('c.deleted_at IS NULL');
  });

  test('FR-032: handles null email and phone in results', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([
      {
        id: 'contact-2',
        first_name: 'Bob',
        last_name: 'Smith',
        email: null,
        phone: null,
        account_id: 'account-2',
        account_name: 'Mountain Provisions',
      },
    ]);

    const results = await searchContacts(mockPrisma as unknown as PrismaClient, tenantId, {
      query: 'bob',
    });

    expect(results[0].email).toBeNull();
    expect(results[0].phone).toBeNull();
  });
});
