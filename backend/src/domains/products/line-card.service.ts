/**
 * Line card service for generating and managing brand line card documents.
 * Supports FR-020 (Brand Line Cards).
 *
 * Line cards are PDF documents listing all active products for a brand,
 * used by sales reps to share product catalogs with accounts.
 *
 * Note: PDF generation currently uses a text buffer placeholder.
 * The generatePdfContent function can be swapped with a real PDF library
 * (e.g., PDFKit, puppeteer) when available.
 */
import type { PrismaClient, LineCard, Product } from '@prisma/client';

import { logger } from '../../shared/utils/logger.js';

/** Paginated result wrapper for line cards */
export interface PaginatedLineCardResult {
  items: LineCard[];
  total: number;
  page: number;
  pageSize: number;
}

/** Result from line card generation */
export interface GenerateLineCardResult {
  lineCard: LineCard;
  productCount: number;
}

/**
 * Generate a text-based line card document content for a brand's products.
 * This is a placeholder implementation that produces formatted text.
 * Replace with a real PDF generation library when available.
 */
export function generatePdfContent(
  brandName: string,
  products: Pick<Product, 'name' | 'sku' | 'category' | 'unit_price' | 'certifications' | 'availability_status'>[],
): Buffer {
  const lines: string[] = [];
  lines.push('='.repeat(60));
  lines.push(`BRAND LINE CARD: ${brandName}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Products: ${products.length}`);
  lines.push('='.repeat(60));
  lines.push('');

  for (const product of products) {
    lines.push(`Product: ${product.name}`);
    lines.push(`  SKU: ${product.sku}`);
    lines.push(`  Category: ${product.category}`);
    lines.push(`  Price: $${Number(product.unit_price).toFixed(2)}`);
    if (product.certifications.length > 0) {
      lines.push(`  Certifications: ${product.certifications.join(', ')}`);
    }
    lines.push(`  Availability: ${product.availability_status}`);
    lines.push('');
  }

  lines.push('='.repeat(60));
  lines.push('End of Line Card');

  return Buffer.from(lines.join('\n'), 'utf-8');
}

/**
 * Generate a line card PDF for a brand's active products (FR-020).
 * Queries all active products for the brand, generates content,
 * stores a LineCard record, and returns the result.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param brandId - Brand ID to generate line card for
 * @param userId - ID of the user generating the line card
 * @returns The generated line card record and product count
 */
export async function generateLineCardPdf(
  prisma: PrismaClient,
  tenantId: string,
  brandId: string,
  userId: string,
): Promise<GenerateLineCardResult> {
  // Get the brand name
  const brand = await prisma.brand.findFirst({
    where: {
      id: brandId,
      tenant_id: tenantId,
    },
  });

  if (!brand) {
    throw new Error('Brand not found');
  }

  // Query all active products for the brand
  const products = await prisma.product.findMany({
    where: {
      tenant_id: tenantId,
      brand_id: brandId,
      is_active: true,
    },
    orderBy: { name: 'asc' },
    select: {
      name: true,
      sku: true,
      category: true,
      unit_price: true,
      certifications: true,
      availability_status: true,
    },
  });

  // Generate PDF content (text buffer placeholder)
  const pdfBuffer = generatePdfContent(brand.name, products);

  // Store as a document reference (in production, upload to S3/GCS and store URL)
  const documentUrl = `line-cards/${tenantId}/${brandId}/${Date.now()}.pdf`;

  // Create LineCard record
  const lineCard = await prisma.lineCard.create({
    data: {
      tenant_id: tenantId,
      brand_id: brandId,
      generated_by_id: userId,
      document_url: documentUrl,
      document_size_bytes: pdfBuffer.length,
      product_count: products.length,
      generated_at: new Date(),
    },
  });

  logger.info(
    {
      operation: 'generate-line-card',
      tenantId,
      brandId,
      lineCardId: lineCard.id,
      productCount: products.length,
      sizeBytes: pdfBuffer.length,
    },
    `Line card generated for brand "${brand.name}" with ${products.length} products`,
  );

  return { lineCard, productCount: products.length };
}

/**
 * List line cards for a brand with pagination (FR-020).
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param brandId - Brand ID to list line cards for
 * @param page - Page number (1-based)
 * @param pageSize - Number of items per page
 * @returns Paginated line card results
 */
export async function listLineCards(
  prisma: PrismaClient,
  tenantId: string,
  brandId: string,
  page: number = 1,
  pageSize: number = 25,
): Promise<PaginatedLineCardResult> {
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.lineCard.findMany({
      where: {
        tenant_id: tenantId,
        brand_id: brandId,
      },
      orderBy: { generated_at: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.lineCard.count({
      where: {
        tenant_id: tenantId,
        brand_id: brandId,
      },
    }),
  ]);

  return { items, total, page, pageSize };
}

/**
 * Get a single line card by ID (FR-020).
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param lineCardId - Line card ID
 * @returns The line card, or null if not found
 */
export async function getLineCardById(
  prisma: PrismaClient,
  tenantId: string,
  lineCardId: string,
): Promise<LineCard | null> {
  return prisma.lineCard.findFirst({
    where: {
      id: lineCardId,
      tenant_id: tenantId,
    },
  });
}
