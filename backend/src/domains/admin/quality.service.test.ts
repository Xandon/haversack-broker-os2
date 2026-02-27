import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateDataQuality,
  getLatestQualityScore,
  getDrillDown,
} from './quality.service';
import { createMockPrisma, type MockPrismaClient } from '../../shared/test-helpers/db';
import type { PrismaClient } from '@prisma/client';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';

describe('FR-029: Data quality scorecard service', () => {
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-27T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateDataQuality', () => {
    it('FR-029: calculates 100% when all accounts are complete', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: '1', name: 'Acme', accountType: 'retail', phone: '555-1234', email: 'a@b.com', address: '123 Main' },
      ]);
      mockPrisma.contact.findMany.mockResolvedValue([
        { id: 'c1', email: 'valid@test.com' },
      ]);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', imageUrl: 'https://img.test/pic.jpg' },
      ]);
      mockPrisma.account.count.mockResolvedValue(0);
      mockPrisma.dataQualityScore.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'score-1',
        ...data,
        createdAt: new Date(),
      }));

      const result = await calculateDataQuality(
        mockPrisma as unknown as PrismaClient,
        TENANT_ID,
      );

      expect(result.accountCompleteness).toBe(100);
      expect(result.contactEmailValidity).toBe(100);
      expect(result.productImages).toBe(100);
      expect(result.duplicateAccountCount).toBe(0);
    });

    it('FR-029: calculates partial completeness for incomplete accounts', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: '1', name: 'Acme', accountType: 'retail', phone: null, email: null, address: null },
        { id: '2', name: 'Beta', accountType: 'restaurant', phone: '555', email: 'b@c.com', address: '456 Oak' },
      ]);
      mockPrisma.contact.findMany.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.account.count.mockResolvedValue(0);
      mockPrisma.dataQualityScore.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'score-1',
        ...data,
        createdAt: new Date(),
      }));

      const result = await calculateDataQuality(
        mockPrisma as unknown as PrismaClient,
        TENANT_ID,
      );

      // Account 1: 2/5 = 0.4, Account 2: 5/5 = 1.0. Average: 0.7 * 100 = 70
      expect(result.accountCompleteness).toBe(70);
    });

    it('FR-029: detects duplicate accounts by normalized name', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: '1', name: 'Acme Corp', accountType: 'retail', phone: '555', email: 'a@b.com', address: '123' },
        { id: '2', name: 'acme corp', accountType: 'retail', phone: '555', email: 'a@b.com', address: '123' },
        { id: '3', name: 'Beta LLC', accountType: 'retail', phone: '555', email: 'b@c.com', address: '456' },
      ]);
      mockPrisma.contact.findMany.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.account.count.mockResolvedValue(0);
      mockPrisma.dataQualityScore.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'score-1',
        ...data,
        createdAt: new Date(),
      }));

      const result = await calculateDataQuality(
        mockPrisma as unknown as PrismaClient,
        TENANT_ID,
      );

      expect(result.duplicateAccountCount).toBe(1);
    });

    it('FR-029: detects invalid contact emails', async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockPrisma.contact.findMany.mockResolvedValue([
        { id: 'c1', email: 'valid@test.com' },
        { id: 'c2', email: 'invalid-email' },
        { id: 'c3', email: null },
      ]);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.account.count.mockResolvedValue(0);
      mockPrisma.dataQualityScore.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'score-1',
        ...data,
        createdAt: new Date(),
      }));

      const result = await calculateDataQuality(
        mockPrisma as unknown as PrismaClient,
        TENANT_ID,
      );

      // 1 valid out of 3 = 33.33
      expect(result.contactEmailValidity).toBeCloseTo(33.33, 1);
    });

    it('FR-029: detects missing product images', async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockPrisma.contact.findMany.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', imageUrl: 'https://img.test/pic.jpg' },
        { id: 'p2', imageUrl: null },
        { id: 'p3', imageUrl: '' },
      ]);
      mockPrisma.account.count.mockResolvedValue(0);
      mockPrisma.dataQualityScore.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'score-1',
        ...data,
        createdAt: new Date(),
      }));

      const result = await calculateDataQuality(
        mockPrisma as unknown as PrismaClient,
        TENANT_ID,
      );

      // 1/3 = 33.33
      expect(result.productImages).toBeCloseTo(33.33, 1);
    });

    it('FR-029: handles empty dataset with 100% scores', async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockPrisma.contact.findMany.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.account.count.mockResolvedValue(0);
      mockPrisma.dataQualityScore.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'score-1',
        ...data,
        createdAt: new Date(),
      }));

      const result = await calculateDataQuality(
        mockPrisma as unknown as PrismaClient,
        TENANT_ID,
      );

      expect(result.accountCompleteness).toBe(100);
      expect(result.contactEmailValidity).toBe(100);
      expect(result.productImages).toBe(100);
      expect(result.compositeScore).toBe(100);
    });

    it('FR-029: computes composite score', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: '1', name: 'Acme', accountType: 'retail', phone: '555', email: 'a@b.com', address: '123' },
      ]);
      mockPrisma.contact.findMany.mockResolvedValue([
        { id: 'c1', email: 'valid@test.com' },
      ]);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', imageUrl: 'https://img.test/pic.jpg' },
      ]);
      mockPrisma.account.count.mockResolvedValue(0);
      mockPrisma.dataQualityScore.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'score-1',
        ...data,
        createdAt: new Date(),
      }));

      const result = await calculateDataQuality(
        mockPrisma as unknown as PrismaClient,
        TENANT_ID,
      );

      expect(result.compositeScore).toBe(100);
    });
  });

  describe('getLatestQualityScore', () => {
    it('FR-029: returns latest score', async () => {
      mockPrisma.dataQualityScore.findFirst.mockResolvedValue({
        id: 'score-1',
        tenantId: TENANT_ID,
        accountCompleteness: 85.5,
        contactEmailValidity: 92.0,
        productImages: 70.0,
        duplicateAccountCount: 3,
        staleAccountCount: 5,
        compositeScore: 80.0,
        calculatedAt: new Date('2026-02-27T03:00:00Z'),
      });

      const result = await getLatestQualityScore(
        mockPrisma as unknown as PrismaClient,
        TENANT_ID,
      );

      expect(result).not.toBeNull();
      expect(result?.accountCompleteness).toBe(85.5);
      expect(result?.calculatedAt).toBe('2026-02-27T03:00:00.000Z');
    });

    it('FR-029: returns null when no score exists', async () => {
      mockPrisma.dataQualityScore.findFirst.mockResolvedValue(null);

      const result = await getLatestQualityScore(
        mockPrisma as unknown as PrismaClient,
        TENANT_ID,
      );

      expect(result).toBeNull();
    });
  });

  describe('getDrillDown', () => {
    it('FR-029: returns incomplete accounts for accountCompleteness', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: '1', name: 'Acme', accountType: 'retail', phone: null, email: null, address: null },
        { id: '2', name: 'Beta', accountType: 'restaurant', phone: '555', email: 'b@c.com', address: '456' },
      ]);

      const result = await getDrillDown(
        mockPrisma as unknown as PrismaClient,
        TENANT_ID,
        'accountCompleteness',
        1,
        50,
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.name).toBe('Acme');
      expect(result.items[0]?.issue).toContain('Missing');
    });

    it('FR-029: returns contacts with invalid emails', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([
        { id: 'c1', firstName: 'John', lastName: 'Doe', email: 'invalid' },
        { id: 'c2', firstName: 'Jane', lastName: 'Smith', email: null },
      ]);

      const result = await getDrillDown(
        mockPrisma as unknown as PrismaClient,
        TENANT_ID,
        'contactEmailValidity',
        1,
        50,
      );

      expect(result.items).toHaveLength(2);
      expect(result.items[0]?.issue).toBe('Invalid email format');
      expect(result.items[1]?.issue).toBe('Missing email');
    });

    it('FR-029: returns products missing images', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Widget A' },
      ]);
      mockPrisma.product.count.mockResolvedValue(1);

      const result = await getDrillDown(
        mockPrisma as unknown as PrismaClient,
        TENANT_ID,
        'productImages',
        1,
        50,
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.issue).toBe('Missing product image');
      expect(result.total).toBe(1);
    });

    it('FR-029: returns duplicate account pairs', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: '1', name: 'Acme Corp' },
        { id: '2', name: 'acme corp' },
      ]);

      const result = await getDrillDown(
        mockPrisma as unknown as PrismaClient,
        TENANT_ID,
        'duplicateAccounts',
        1,
        50,
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.issue).toContain('Duplicate');
    });

    it('FR-029: returns stale accounts', async () => {
      const staleDate = new Date('2025-10-01T00:00:00Z');
      mockPrisma.account.findMany.mockResolvedValue([
        { id: '1', name: 'Stale Corp', updatedAt: staleDate },
      ]);
      mockPrisma.account.count.mockResolvedValue(1);

      const result = await getDrillDown(
        mockPrisma as unknown as PrismaClient,
        TENANT_ID,
        'staleAccounts',
        1,
        50,
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.issue).toContain('Last updated');
    });

    it('FR-029: returns empty for unknown metric', async () => {
      const result = await getDrillDown(
        mockPrisma as unknown as PrismaClient,
        TENANT_ID,
        'unknownMetric',
        1,
        50,
      );

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('FR-029: paginates drill-down results', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: '1', name: 'A', accountType: null, phone: null, email: null, address: null },
        { id: '2', name: 'B', accountType: null, phone: null, email: null, address: null },
        { id: '3', name: 'C', accountType: null, phone: null, email: null, address: null },
      ]);

      const result = await getDrillDown(
        mockPrisma as unknown as PrismaClient,
        TENANT_ID,
        'accountCompleteness',
        2,
        1,
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.name).toBe('B');
      expect(result.total).toBe(3);
      expect(result.page).toBe(2);
    });
  });
});
