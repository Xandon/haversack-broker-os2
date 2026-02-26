import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import {
  createOrderSchema,
  updateOrderSchema,
  orderListQuerySchema,
  rejectionReasonSchema,
} from '@haversack/shared';
import {
  createOrder,
  getOrderById,
  listOrders,
  updateDraftOrder,
  submitOrder,
  cancelOrder,
  OrderError,
} from './order.service';
import type { AuditContext } from './order.service';
import { approveOrder, rejectOrder, listApprovalQueue } from './order-approval.service';

function getAuditContext(request: FastifyRequest): AuditContext {
  return {
    actorId: request.user!.userId,
    actorEmail: request.user!.email,
    ipAddress: request.ip,
    userAgent: (request.headers['user-agent'] as string) ?? undefined,
    requestId: request.requestId,
  };
}

function handleOrderError(
  error: unknown,
  requestId: string,
  reply: FastifyReply,
): unknown {
  if (error instanceof OrderError) {
    const statusMap: Record<string, number> = {
      ORDER_NOT_FOUND: 404,
      ORDER_CONFLICT: 409,
      ORDER_NOT_DRAFT: 400,
      ORDER_NO_LINE_ITEMS: 400,
      ORDER_NOT_PENDING_APPROVAL: 400,
      ORDER_CANNOT_CANCEL: 400,
      ORDER_REJECTION_REASON_REQUIRED: 400,
    };
    const status = statusMap[error.code] ?? 400;
    return reply.status(status).send({
      error: error.code,
      message: error.message,
      code: error.code,
      requestId,
    });
  }
  throw error;
}

function formatOrderResponse(order: Record<string, unknown>): Record<string, unknown> {
  const o = order as Record<string, unknown>;
  const lineItems = (o['lineItems'] as Array<Record<string, unknown>>) ?? [];
  const vendorSubOrders = (o['vendorSubOrders'] as Array<Record<string, unknown>>) ?? [];
  const approvals = (o['approvals'] as Array<Record<string, unknown>>) ?? [];
  const account = o['account'] as Record<string, unknown> | null;
  const rep = o['rep'] as Record<string, unknown> | null;

  return {
    id: o['id'],
    orderNumber: o['orderNumber'],
    accountId: o['accountId'],
    accountName: account ? account['name'] : null,
    repId: o['repId'],
    repName: rep ? `${rep['firstName']} ${rep['lastName']}` : null,
    status: o['status'],
    subtotal: Number(o['subtotal']),
    tax: Number(o['tax']),
    total: Number(o['total']),
    notes: o['notes'],
    lineItems: lineItems.map((li) => {
      const product = li['product'] as Record<string, unknown> | null;
      const brand = product ? (product['brand'] as Record<string, unknown>) : null;
      return {
        id: li['id'],
        productId: li['productId'],
        productName: product ? product['name'] : null,
        productSku: product ? product['sku'] : null,
        brandName: brand ? brand['name'] : null,
        vendorSubOrderId: li['vendorSubOrderId'],
        quantity: li['quantity'],
        unitPrice: Number(li['unitPrice']),
        revenueModel: li['revenueModel'],
        commissionRate: li['commissionRate'] != null ? Number(li['commissionRate']) : null,
        discount: Number(li['discount']),
        lineTotal: Number(li['lineTotal']),
        promotionalPriceApplied: li['promotionalPriceApplied'],
      };
    }),
    vendorSubOrders: vendorSubOrders.map((vso) => {
      const brand = vso['brand'] as Record<string, unknown> | null;
      const subLineItems = (vso['lineItems'] as Array<Record<string, unknown>>) ?? [];
      return {
        id: vso['id'],
        brandId: vso['brandId'],
        brandName: brand ? brand['name'] : null,
        subtotal: Number(vso['subtotal']),
        fulfillmentStatus: vso['fulfillmentStatus'],
        lineItemCount: subLineItems.length,
      };
    }),
    approvals: approvals.map((a) => {
      const approver = a['approver'] as Record<string, unknown> | null;
      return {
        id: a['id'],
        approverId: a['approverId'],
        approverName: approver ? `${approver['firstName']} ${approver['lastName']}` : null,
        decision: a['decision'],
        reason: a['reason'],
        decidedAt: a['decidedAt'] instanceof Date ? (a['decidedAt'] as Date).toISOString() : a['decidedAt'],
      };
    }),
    exportStatus: o['exportStatus'],
    submittedAt: o['submittedAt'] instanceof Date ? (o['submittedAt'] as Date).toISOString() : o['submittedAt'],
    confirmedAt: o['confirmedAt'] instanceof Date ? (o['confirmedAt'] as Date).toISOString() : o['confirmedAt'],
    cancelledAt: o['cancelledAt'] instanceof Date ? (o['cancelledAt'] as Date).toISOString() : o['cancelledAt'],
    version: o['version'],
    createdAt: o['createdAt'] instanceof Date ? (o['createdAt'] as Date).toISOString() : o['createdAt'],
    updatedAt: o['updatedAt'] instanceof Date ? (o['updatedAt'] as Date).toISOString() : o['updatedAt'],
  };
}

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/orders — create draft order
  app.post(
    '/api/orders',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createOrderSchema.parse(request.body);
        const tenantId = request.user!.tenantId;
        const repId = request.user!.userId;
        const audit = getAuditContext(request);

        const order = await createOrder(
          app.prisma,
          tenantId,
          repId,
          body,
          audit,
        );

        return reply
          .status(201)
          .send({ data: formatOrderResponse(order as unknown as Record<string, unknown>) });
      } catch (error) {
        return handleOrderError(error, request.requestId, reply);
      }
    },
  );

  // GET /api/orders — list orders
  app.get(
    '/api/orders',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = orderListQuerySchema.parse(request.query);
        const tenantId = request.user!.tenantId;

        const result = await listOrders(app.prisma, tenantId, query);

        return reply.status(200).send({
          data: result.data.map((o) =>
            formatOrderResponse(o as unknown as Record<string, unknown>),
          ),
          pagination: result.pagination,
        });
      } catch (error) {
        return handleOrderError(error, request.requestId, reply);
      }
    },
  );

  // GET /api/orders/approval-queue — manager approval queue
  app.get(
    '/api/orders/approval-queue',
    { preHandler: [authenticate, authorize('manager')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = request.query as { cursor?: string; limit?: string };
        const tenantId = request.user!.tenantId;

        const result = await listApprovalQueue(app.prisma, tenantId, {
          cursor: query.cursor,
          limit: query.limit ? parseInt(query.limit, 10) : undefined,
        });

        return reply.status(200).send({
          data: result.data.map((o) =>
            formatOrderResponse(o as unknown as Record<string, unknown>),
          ),
          pagination: result.pagination,
        });
      } catch (error) {
        return handleOrderError(error, request.requestId, reply);
      }
    },
  );

  // GET /api/orders/:id — get order detail
  app.get(
    '/api/orders/:id',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenantId = request.user!.tenantId;
        const order = await getOrderById(app.prisma, tenantId, request.params.id);

        return reply
          .status(200)
          .send({ data: formatOrderResponse(order as unknown as Record<string, unknown>) });
      } catch (error) {
        return handleOrderError(error, request.requestId, reply);
      }
    },
  );

  // PUT /api/orders/:id — update draft order
  app.put(
    '/api/orders/:id',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const body = updateOrderSchema.parse(request.body);
        const tenantId = request.user!.tenantId;
        const expectedUpdatedAt = request.headers['if-match'] as
          | string
          | undefined;
        const audit = getAuditContext(request);

        const order = await updateDraftOrder(
          app.prisma,
          tenantId,
          request.params.id,
          body,
          expectedUpdatedAt,
          audit,
        );

        return reply
          .status(200)
          .send({ data: formatOrderResponse(order as unknown as Record<string, unknown>) });
      } catch (error) {
        return handleOrderError(error, request.requestId, reply);
      }
    },
  );

  // POST /api/orders/:id/submit — submit order
  app.post(
    '/api/orders/:id/submit',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenantId = request.user!.tenantId;
        const audit = getAuditContext(request);

        const order = await submitOrder(
          app.prisma,
          tenantId,
          request.params.id,
          audit,
        );

        return reply
          .status(200)
          .send({ data: formatOrderResponse(order as unknown as Record<string, unknown>) });
      } catch (error) {
        return handleOrderError(error, request.requestId, reply);
      }
    },
  );

  // POST /api/orders/:id/approve — approve order (manager only)
  app.post(
    '/api/orders/:id/approve',
    { preHandler: [authenticate, authorize('manager')] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenantId = request.user!.tenantId;
        const approverId = request.user!.userId;
        const audit = getAuditContext(request);

        const order = await approveOrder(
          app.prisma,
          tenantId,
          request.params.id,
          approverId,
          audit,
        );

        return reply
          .status(200)
          .send({ data: formatOrderResponse(order as unknown as Record<string, unknown>) });
      } catch (error) {
        return handleOrderError(error, request.requestId, reply);
      }
    },
  );

  // POST /api/orders/:id/reject — reject order (manager only)
  app.post(
    '/api/orders/:id/reject',
    { preHandler: [authenticate, authorize('manager')] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const body = rejectionReasonSchema.parse(request.body);
        const tenantId = request.user!.tenantId;
        const approverId = request.user!.userId;
        const audit = getAuditContext(request);

        const order = await rejectOrder(
          app.prisma,
          tenantId,
          request.params.id,
          approverId,
          body.reason,
          audit,
        );

        return reply
          .status(200)
          .send({ data: formatOrderResponse(order as unknown as Record<string, unknown>) });
      } catch (error) {
        return handleOrderError(error, request.requestId, reply);
      }
    },
  );

  // POST /api/orders/:id/cancel — cancel order
  app.post(
    '/api/orders/:id/cancel',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenantId = request.user!.tenantId;
        const audit = getAuditContext(request);

        const order = await cancelOrder(
          app.prisma,
          tenantId,
          request.params.id,
          audit,
        );

        return reply
          .status(200)
          .send({ data: formatOrderResponse(order as unknown as Record<string, unknown>) });
      } catch (error) {
        return handleOrderError(error, request.requestId, reply);
      }
    },
  );
}
