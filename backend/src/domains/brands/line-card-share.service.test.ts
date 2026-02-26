import { describe, test, expect, vi, beforeEach } from 'vitest';
import { shareLineCard } from './line-card-share.service';
import { BrandError } from './brand.service';
import type { PrismaClient } from '@prisma/client';

vi.mock('./line-card.service', () => ({
  generateLineCard: vi.fn().mockResolvedValue({
    buffer: Buffer.from('mock-pdf'),
    filename: 'test-brand-line-card-2026-02-26.pdf',
  }),
}));

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const BRAND_ID = '00000000-0000-4000-a000-000000000020';
const ACCOUNT_ID = '00000000-0000-4000-a000-000000000030';

const MOCK_ACCOUNT = {
  id: ACCOUNT_ID,
  tenantId: TENANT_ID,
  name: 'Test Account',
  deletedAt: null,
  contacts: [
    {
      id: 'contact-1',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      isPrimary: true,
      deletedAt: null,
    },
  ],
};

const MOCK_BRAND = {
  id: BRAND_ID,
  tenantId: TENANT_ID,
  name: 'Mountain Meadow Farms',
};

function createMockPrisma(): {
  prisma: PrismaClient;
  account: { findFirst: ReturnType<typeof vi.fn> };
  brand: { findFirst: ReturnType<typeof vi.fn> };
} {
  const account = { findFirst: vi.fn() };
  const brand = { findFirst: vi.fn() };
  return {
    prisma: { account, brand } as unknown as PrismaClient,
    account,
    brand,
  };
}

describe('FR-019b: Line card share service', () => {
  let prisma: PrismaClient;
  let accountMock: { findFirst: ReturnType<typeof vi.fn> };
  let brandMock: { findFirst: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockPrisma();
    prisma = mock.prisma;
    accountMock = mock.account;
    brandMock = mock.brand;
  });

  test('FR-019b: shares line card with primary contact email', async () => {
    accountMock.findFirst.mockResolvedValue(MOCK_ACCOUNT);
    brandMock.findFirst.mockResolvedValue(MOCK_BRAND);

    const result = await shareLineCard(prisma, TENANT_ID, BRAND_ID, ACCOUNT_ID);

    expect(result.recipientEmail).toBe('jane@example.com');
    expect(result.recipientName).toBe('Jane Smith');
    expect(result.brandName).toBe('Mountain Meadow Farms');
    expect(result.filename).toBe('test-brand-line-card-2026-02-26.pdf');
  });

  test('FR-019b: throws when account not found', async () => {
    accountMock.findFirst.mockResolvedValue(null);

    await expect(
      shareLineCard(prisma, TENANT_ID, BRAND_ID, ACCOUNT_ID),
    ).rejects.toThrow('Account not found');
  });

  test('FR-019b: throws BrandError when account not found', async () => {
    accountMock.findFirst.mockResolvedValue(null);

    await expect(
      shareLineCard(prisma, TENANT_ID, BRAND_ID, ACCOUNT_ID),
    ).rejects.toThrow(BrandError);
  });

  test('AC-019b: throws when no primary contact exists', async () => {
    const accountNoContacts = { ...MOCK_ACCOUNT, contacts: [] };
    accountMock.findFirst.mockResolvedValue(accountNoContacts);

    await expect(
      shareLineCard(prisma, TENANT_ID, BRAND_ID, ACCOUNT_ID),
    ).rejects.toThrow('no primary contact');
  });

  test('AC-019b: throws when primary contact has no email', async () => {
    const accountNoEmail = {
      ...MOCK_ACCOUNT,
      contacts: [{ ...MOCK_ACCOUNT.contacts[0], email: null }],
    };
    accountMock.findFirst.mockResolvedValue(accountNoEmail);

    await expect(
      shareLineCard(prisma, TENANT_ID, BRAND_ID, ACCOUNT_ID),
    ).rejects.toThrow('no primary contact');
  });

  test('FR-019b: queries account with tenant isolation', async () => {
    accountMock.findFirst.mockResolvedValue(MOCK_ACCOUNT);
    brandMock.findFirst.mockResolvedValue(MOCK_BRAND);

    await shareLineCard(prisma, TENANT_ID, BRAND_ID, ACCOUNT_ID);

    expect(accountMock.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: ACCOUNT_ID,
          tenantId: TENANT_ID,
          deletedAt: null,
        }),
      }),
    );
  });
});
