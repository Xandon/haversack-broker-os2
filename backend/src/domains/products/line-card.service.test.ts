/**
 * Line card service unit tests.
 * T118: Validates line card generation, listing, and retrieval.
 * Tests reference FR-020.
 */
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';

import {
  generateLineCardPdf,
  listLineCards,
  getLineCardById,
  generatePdfContent,
} from './line-card.service.js';

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------

function createMockPrisma() {
  return {
    brand: {
      findFirst: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    lineCard: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockPrisma = ReturnType<typeof createMockPrisma> & Record<string, any>;

const TEST_TENANT_ID = '660e8400-e29b-41d4-a716-446655440000';
const TEST_BRAND_ID = '990e8400-e29b-41d4-a716-446655440001';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_LINE_CARD_ID = 'aae08400-e29b-41d4-a716-446655440001';

const NOW = new Date('2026-02-25T12:00:00.000Z');

// ---------------------------------------------------------------------------
// generatePdfContent Tests
// ---------------------------------------------------------------------------

describe('generatePdfContent', () => {
  test('FR-020: generates text content for brand products', () => {
    const products = [
      {
        name: 'Organic Honey 12oz',
        sku: 'BEE-HON-12',
        category: 'Honey',
        unit_price: new Decimal('8.50'),
        certifications: ['Organic', 'Non-GMO'],
        availability_status: 'in_stock' as const,
      },
    ];

    const buffer = generatePdfContent("Bee's Best Honey", products);
    const content = buffer.toString('utf-8');

    expect(content).toContain("Bee's Best Honey");
    expect(content).toContain('Organic Honey 12oz');
    expect(content).toContain('BEE-HON-12');
    expect(content).toContain('$8.50');
    expect(content).toContain('Organic, Non-GMO');
    expect(buffer.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// generateLineCardPdf Tests (FR-020)
// ---------------------------------------------------------------------------

describe('generateLineCardPdf', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  test('FR-020: generates line card for brand with active products', async () => {
    mockPrisma.brand.findFirst.mockResolvedValue({
      id: TEST_BRAND_ID,
      tenant_id: TEST_TENANT_ID,
      name: "Bee's Best Honey",
    });

    mockPrisma.product.findMany.mockResolvedValue([
      {
        name: 'Organic Honey 12oz',
        sku: 'BEE-HON-12',
        category: 'Honey',
        unit_price: new Decimal('8.50'),
        certifications: ['Organic'],
        availability_status: 'in_stock',
      },
      {
        name: 'Raw Honey 16oz',
        sku: 'BEE-RAW-16',
        category: 'Honey',
        unit_price: new Decimal('12.00'),
        certifications: [],
        availability_status: 'in_stock',
      },
    ]);

    const createdLineCard = {
      id: TEST_LINE_CARD_ID,
      tenant_id: TEST_TENANT_ID,
      brand_id: TEST_BRAND_ID,
      generated_by_id: TEST_USER_ID,
      document_url: expect.any(String),
      document_size_bytes: expect.any(Number),
      product_count: 2,
      generated_at: NOW,
      expires_at: null,
      created_at: NOW,
      updated_at: NOW,
    };

    mockPrisma.lineCard.create.mockResolvedValue(createdLineCard);

    const result = await generateLineCardPdf(
      mockPrisma as unknown as Parameters<typeof generateLineCardPdf>[0],
      TEST_TENANT_ID,
      TEST_BRAND_ID,
      TEST_USER_ID,
    );

    expect(result.productCount).toBe(2);
    expect(result.lineCard.product_count).toBe(2);
    expect(mockPrisma.lineCard.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenant_id: TEST_TENANT_ID,
          brand_id: TEST_BRAND_ID,
          generated_by_id: TEST_USER_ID,
          product_count: 2,
        }),
      }),
    );
  });

  test('FR-020: returns empty when brand has no active products', async () => {
    mockPrisma.brand.findFirst.mockResolvedValue({
      id: TEST_BRAND_ID,
      tenant_id: TEST_TENANT_ID,
      name: 'Empty Brand',
    });

    mockPrisma.product.findMany.mockResolvedValue([]);

    const createdLineCard = {
      id: TEST_LINE_CARD_ID,
      tenant_id: TEST_TENANT_ID,
      brand_id: TEST_BRAND_ID,
      generated_by_id: TEST_USER_ID,
      document_url: expect.any(String),
      document_size_bytes: expect.any(Number),
      product_count: 0,
      generated_at: NOW,
      expires_at: null,
      created_at: NOW,
      updated_at: NOW,
    };

    mockPrisma.lineCard.create.mockResolvedValue(createdLineCard);

    const result = await generateLineCardPdf(
      mockPrisma as unknown as Parameters<typeof generateLineCardPdf>[0],
      TEST_TENANT_ID,
      TEST_BRAND_ID,
      TEST_USER_ID,
    );

    expect(result.productCount).toBe(0);
    expect(result.lineCard.product_count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// listLineCards Tests (FR-020)
// ---------------------------------------------------------------------------

describe('listLineCards', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  test('FR-020: lists line cards for a brand', async () => {
    const lineCards = [
      {
        id: TEST_LINE_CARD_ID,
        tenant_id: TEST_TENANT_ID,
        brand_id: TEST_BRAND_ID,
        generated_by_id: TEST_USER_ID,
        document_url: 'line-cards/test.pdf',
        product_count: 5,
        generated_at: NOW,
        created_at: NOW,
        updated_at: NOW,
      },
    ];

    mockPrisma.lineCard.findMany.mockResolvedValue(lineCards);
    mockPrisma.lineCard.count.mockResolvedValue(1);

    const result = await listLineCards(
      mockPrisma as unknown as Parameters<typeof listLineCards>[0],
      TEST_TENANT_ID,
      TEST_BRAND_ID,
    );

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
    expect(mockPrisma.lineCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenant_id: TEST_TENANT_ID,
          brand_id: TEST_BRAND_ID,
        },
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// getLineCardById Tests (FR-020)
// ---------------------------------------------------------------------------

describe('getLineCardById', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  test('FR-020: returns null for non-existent line card', async () => {
    mockPrisma.lineCard.findFirst.mockResolvedValue(null);

    const result = await getLineCardById(
      mockPrisma as unknown as Parameters<typeof getLineCardById>[0],
      TEST_TENANT_ID,
      'non-existent-id',
    );

    expect(result).toBeNull();
    expect(mockPrisma.lineCard.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'non-existent-id',
        tenant_id: TEST_TENANT_ID,
      },
    });
  });
});
