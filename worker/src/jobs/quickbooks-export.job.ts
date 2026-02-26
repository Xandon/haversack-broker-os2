import type { PrismaClient } from '@prisma/client';
import { QUICKBOOKS_MAX_RETRIES } from '../queues/quickbooks-export.queue';

export interface QuickBooksExportResult {
  ordersProcessed: number;
  csvGenerated: boolean;
  csvContent: string | null;
  failedExports: number;
}

export function generateOrderCsv(
  orders: Array<Record<string, unknown>>,
): string {
  const headers = [
    'Order Number',
    'Date',
    'Account Name',
    'Rep Name',
    'SKU',
    'Product Name',
    'Quantity',
    'Unit Price',
    'Line Total',
    'Discount',
    'Tax',
    'Order Total',
  ];

  const rows: string[] = [headers.join(',')];

  for (const order of orders) {
    const account = order['account'] as Record<string, unknown> | null;
    const rep = order['rep'] as Record<string, unknown> | null;
    const lineItems = (order['lineItems'] as Array<Record<string, unknown>>) ?? [];
    const orderDate = order['confirmedAt']
      ? new Date(order['confirmedAt'] as string).toISOString().slice(0, 10)
      : new Date(order['createdAt'] as string).toISOString().slice(0, 10);

    for (const li of lineItems) {
      const product = li['product'] as Record<string, unknown> | null;
      const row = [
        csvEscape(String(order['orderNumber'])),
        csvEscape(orderDate),
        csvEscape(account ? String(account['name']) : ''),
        csvEscape(rep ? `${rep['firstName']} ${rep['lastName']}` : ''),
        csvEscape(product ? String(product['sku']) : ''),
        csvEscape(product ? String(product['name']) : ''),
        String(li['quantity']),
        String(li['unitPrice']),
        String(li['lineTotal']),
        String(li['discount'] ?? 0),
        String(order['tax'] ?? 0),
        String(order['total']),
      ];
      rows.push(row.join(','));
    }
  }

  return rows.join('\n');
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function processQuickBooksExport(
  prisma: PrismaClient,
  tenantId: string,
): Promise<QuickBooksExportResult> {
  // Find confirmed orders that haven't been exported yet
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status: 'confirmed',
      exportStatus: null,
    },
    include: {
      lineItems: {
        include: {
          product: true,
        },
      },
      account: { select: { name: true } },
      rep: { select: { firstName: true, lastName: true } },
    },
    orderBy: { confirmedAt: 'asc' },
  });

  if (orders.length === 0) {
    return {
      ordersProcessed: 0,
      csvGenerated: false,
      csvContent: null,
      failedExports: 0,
    };
  }

  // Check for previously failed exports that exceeded max retries
  let failedExports = 0;
  const ordersToExport: Array<Record<string, unknown>> = [];

  for (const order of orders) {
    const existingExport = await prisma.quickBooksExport.findFirst({
      where: { orderId: order.id },
      orderBy: { createdAt: 'desc' },
    });

    if (existingExport && existingExport.attemptCount >= QUICKBOOKS_MAX_RETRIES) {
      failedExports++;
      continue;
    }

    ordersToExport.push(order as unknown as Record<string, unknown>);
  }

  if (ordersToExport.length === 0) {
    return {
      ordersProcessed: 0,
      csvGenerated: false,
      csvContent: null,
      failedExports,
    };
  }

  const csvContent = generateOrderCsv(ordersToExport);

  // Create export records for each order
  for (const order of ordersToExport) {
    await prisma.quickBooksExport.create({
      data: {
        tenantId,
        orderId: order['id'] as string,
        exportStatus: 'queued',
        attemptCount: 1,
        csvPayload: csvContent,
      },
    });
  }

  return {
    ordersProcessed: ordersToExport.length,
    csvGenerated: true,
    csvContent,
    failedExports,
  };
}
