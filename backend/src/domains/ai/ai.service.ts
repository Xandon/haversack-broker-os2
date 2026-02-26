/**
 * AI reorder suggestion service.
 * Analyzes order history for accounts with 6+ orders in 12 months
 * and generates AI-powered reorder suggestions.
 * Implements FR-018, FR-035, FR-036.
 */
import type { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { logger } from '../../shared/utils/logger.js';
import { createAuditEntry } from '../../shared/middleware/audit-trail.js';
import { callAiProvider } from './provider-abstraction.js';
import type {
  ReorderSuggestionResponse,
  ReorderSuggestionItem,
  SubmitReorderInput,
} from './ai.schema.js';

/** Minimum orders required for AI suggestions (FR-018) */
const MIN_ORDERS_FOR_SUGGESTION = 6;

/** Analysis period in months */
const ANALYSIS_PERIOD_MONTHS = 12;

/**
 * Build the prompt for the AI provider based on order history.
 */
function buildReorderPrompt(
  accountName: string,
  orderHistory: Array<{
    order_number: string;
    created_at: Date;
    total: { toNumber?: () => number } | number;
    order_items: Array<{
      quantity: number;
      unit_price: { toNumber?: () => number } | number;
      product: {
        id: string;
        name: string;
        sku: string;
        brand?: { id: string; name: string } | null;
        unit_price: { toNumber?: () => number } | number;
      };
    }>;
  }>,
): string {
  const orderSummaries = orderHistory.map((order) => {
    const items = order.order_items.map((item) => {
      const price =
        typeof item.unit_price === 'object' && item.unit_price !== null && typeof item.unit_price.toNumber === 'function'
          ? item.unit_price.toNumber()
          : Number(item.unit_price);
      return `  - ${item.product.name} (${item.product.sku}), brand: ${item.product.brand?.name ?? 'Unknown'}, qty: ${item.quantity}, price: $${price.toFixed(2)}`;
    });
    return `Order ${order.order_number} (${new Date(order.created_at).toISOString().split('T')[0]}):\n${items.join('\n')}`;
  });

  return `Analyze the order history for "${accountName}" and suggest a reorder based on patterns.
Return a JSON object with this exact structure:
{
  "items": [
    {
      "product_id": "uuid",
      "product_name": "Product Name",
      "sku": "SKU-CODE",
      "brand_name": "Brand Name",
      "suggested_quantity": 24,
      "unit_price": 8.50,
      "line_total": 204.00,
      "reasoning": "Brief explanation of why this quantity"
    }
  ],
  "estimated_total": 285.00,
  "based_on_orders": ${orderHistory.length},
  "analysis_period_months": ${ANALYSIS_PERIOD_MONTHS}
}

Order history (${orderHistory.length} orders):
${orderSummaries.join('\n\n')}

Rules:
- Only suggest products that appeared in at least 2 orders
- Suggest quantities based on the average or trending pattern
- Calculate line_total as suggested_quantity * unit_price
- estimated_total is the sum of all line_totals
- Return ONLY valid JSON, no markdown or extra text`;
}

/**
 * Generate AI-powered reorder suggestions for an account (FR-018).
 * Returns structured suggestion for accounts with 6+ orders in 12 months.
 * Returns "not enough history" for accounts with fewer orders.
 * Throws on AI service unavailability (FR-036).
 */
export async function generateReorderSuggestion(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
): Promise<ReorderSuggestionResponse> {
  // Verify account exists with tenant isolation
  const account = await prisma.account.findFirst({
    where: { id: accountId, tenant_id: tenantId },
    select: { id: true, name: true },
  });

  if (!account) {
    throw new Error('Account not found');
  }

  // Count confirmed orders in the last 12 months
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - ANALYSIS_PERIOD_MONTHS);

  const orderCount = await prisma.order.count({
    where: {
      account_id: accountId,
      tenant_id: tenantId,
      status: { in: ['confirmed', 'approved'] },
      created_at: { gte: twelveMonthsAgo },
      parent_order_id: null,
    },
  });

  // FR-018: < 6 orders → return "not enough history"
  if (orderCount < MIN_ORDERS_FOR_SUGGESTION) {
    return {
      account_id: accountId,
      account_name: account.name,
      ai_generated: false,
      suggestion: null,
      message:
        'Not enough order history for suggestions — reorder suggestions appear after 6 orders',
      current_order_count: orderCount,
    };
  }

  // Fetch order history with line items and products
  const orders = await prisma.order.findMany({
    where: {
      account_id: accountId,
      tenant_id: tenantId,
      status: { in: ['confirmed', 'approved'] },
      created_at: { gte: twelveMonthsAgo },
      parent_order_id: null,
    },
    include: {
      order_items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit_price: true,
              brand: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  // Build prompt and call AI provider
  const prompt = buildReorderPrompt(account.name, orders);
  const systemPrompt =
    'You are a specialty food sales assistant that analyzes order history to suggest reorders. Return only valid JSON with the exact structure requested. Do not include markdown formatting.';

  const aiResult = await callAiProvider({ prompt, systemPrompt });

  // FR-036: AI unavailable → throw (no stale content)
  if (!aiResult.success) {
    throw new Error(
      aiResult.error ?? 'AI service temporarily unavailable — please try again in a few minutes',
    );
  }

  // Parse AI response
  let suggestion: {
    items: ReorderSuggestionItem[];
    estimated_total: number;
    based_on_orders: number;
    analysis_period_months: number;
  };

  try {
    suggestion = JSON.parse(aiResult.content ?? '{}') as typeof suggestion;
  } catch {
    logger.error(
      { operation: 'parse-ai-response', accountId, content: aiResult.content },
      'Failed to parse AI reorder suggestion response',
    );
    throw new Error('AI service returned invalid response');
  }

  logger.info(
    {
      operation: 'generate-reorder-suggestion',
      tenantId,
      accountId,
      orderCount,
      suggestedItems: suggestion.items?.length ?? 0,
      estimatedTotal: suggestion.estimated_total,
      provider: aiResult.provider,
    },
    `Reorder suggestion generated for ${account.name}`,
  );

  // FR-035: Label as AI-Generated
  return {
    account_id: accountId,
    account_name: account.name,
    ai_generated: true,
    ai_label: 'AI-Generated',
    suggestion: {
      items: suggestion.items ?? [],
      estimated_total: suggestion.estimated_total ?? 0,
      based_on_orders: suggestion.based_on_orders ?? orderCount,
      analysis_period_months: suggestion.analysis_period_months ?? ANALYSIS_PERIOD_MONTHS,
    },
    generated_at: new Date().toISOString(),
  };
}

/**
 * Submit a modified reorder suggestion as a new order (FR-018).
 * Creates a real order from the user's modified suggestion items.
 */
export async function submitReorderAsOrder(
  prisma: PrismaClient,
  tenantId: string,
  input: SubmitReorderInput,
  actorId: string,
  actorEmail: string,
): Promise<{ order_id: string; order_number: string; status: string; total: number; source: string }> {
  // Fetch products for pricing
  const productIds = input.items.map((item) => item.product_id);
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      tenant_id: tenantId,
      is_active: true,
    },
    include: {
      brand: { select: { id: true, name: true } },
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of input.items) {
    if (!productMap.has(item.product_id)) {
      throw new Error(`Product not found: ${item.product_id}`);
    }
  }

  // Build line items
  const lineItems = input.items.map((item) => {
    const product = productMap.get(item.product_id)!;
    const unitPrice =
      item.unit_price ??
      (typeof product.unit_price === 'object' && product.unit_price !== null && typeof (product.unit_price as { toNumber?: () => number }).toNumber === 'function'
        ? (product.unit_price as { toNumber: () => number }).toNumber()
        : Number(product.unit_price));
    const lineTotal = unitPrice * item.quantity;

    return {
      product_id: item.product_id,
      brand_id: product.brand_id,
      quantity: item.quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
      revenue_model: product.revenue_model as string,
    };
  });

  const total = lineItems.reduce((sum, item) => sum + item.line_total, 0);
  const approvalRequired = total >= 5000;
  const status = approvalRequired ? 'pending_approval' : 'pending';

  // Create order in transaction
  const result = await prisma.$transaction(async (tx) => {
    const count = await tx.order.count({ where: { tenant_id: tenantId } });
    const seq = String(count + 1).padStart(6, '0');
    const orderNumber = `ORD-${new Date().getFullYear()}-${seq}`;

    const order = await tx.order.create({
      data: {
        tenant_id: tenantId,
        order_number: orderNumber,
        account_id: input.account_id,
        rep_id: actorId,
        status,
        subtotal: new Decimal(total.toFixed(2)),
        tax_amount: new Decimal('0.00'),
        total: new Decimal(total.toFixed(2)),
        approval_required: approvalRequired,
        notes: input.notes ?? 'Created from AI reorder suggestion',
      },
    });

    // Create line items
    for (const item of lineItems) {
      await tx.orderItem.create({
        data: {
          tenant_id: tenantId,
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: new Decimal(item.unit_price.toFixed(2)),
          line_total: new Decimal(item.line_total.toFixed(2)),
          revenue_model: item.revenue_model as 'broker' | 'wholesale',
        },
      });
    }

    return order;
  });

  // Audit trail
  void createAuditEntry(prisma, {
    tenantId,
    actorId,
    actorEmail,
    entityType: 'Order',
    entityId: result.id,
    action: 'create',
    newValue: JSON.stringify({
      order_number: result.order_number,
      total: total.toFixed(2),
      source: 'ai_reorder_suggestion',
      item_count: input.items.length,
    }),
  });

  logger.info(
    {
      operation: 'submit-reorder-suggestion',
      tenantId,
      orderId: result.id,
      orderNumber: result.order_number,
      total,
      itemCount: input.items.length,
      actorId,
    },
    `Reorder suggestion submitted as order: ${result.order_number}`,
  );

  return {
    order_id: result.id,
    order_number: result.order_number,
    status,
    total,
    source: 'ai_reorder_suggestion',
  };
}
