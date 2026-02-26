/**
 * Order domain route handlers for Fastify.
 * POST   /api/orders                — create order (rep, manager, admin)
 * GET    /api/orders                — list orders with filters/pagination
 * GET    /api/orders/pending-approval — list orders awaiting approval (manager, admin)
 * GET    /api/orders/:id            — get order detail by ID
 * PATCH  /api/orders/:id            — update order (notes, limited status)
 * POST   /api/orders/:id/approve    — approve order (manager, admin)
 * POST   /api/orders/:id/reject     — reject order (manager, admin)
 * POST   /api/orders/:id/confirm    — confirm order (rep, manager, admin)
 *
 * All routes require authentication and enforce tenant isolation.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import {
  createOrderSchema,
  updateOrderSchema,
  orderListQuerySchema,
  approveOrderSchema,
  rejectOrderSchema,
} from '@haversack/shared';
import { extractUser, requireRole } from '../../auth/rbac.middleware.js';
import {
  createOrder,
  getOrderById,
  listOrders,
  listPendingApproval,
  updateOrder,
} from './order.service.js';
import { approveOrder, rejectOrder, confirmOrder } from './approval.service.js';

/** Query schema for pending approval list */
import { z } from 'zod';

const pendingApprovalQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
  rep_id: z.string().uuid().optional(),
});

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/orders
   * Create a new order with line items (FR-013, FR-014, FR-016, FR-017).
   */
  app.post(
    '/api/orders',
    {
      preHandler: [extractUser, requireRole('rep', 'manager', 'admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const body = createOrderSchema.parse(request.body);
      const user = request.user;

      if (!user) {
        void reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      const result = await createOrder(
        app.prisma,
        user.tenantId,
        body,
        user.userId,
        user.email,
      );

      void reply.status(201).send({
        data: {
          id: result.id,
          order_number: result.order_number,
          account_id: result.account_id,
          rep_id: result.rep_id,
          status: result.status,
          subtotal: Number(result.subtotal),
          tax_amount: Number(result.tax_amount),
          total: Number(result.total),
          approval_required: result.approval_required,
          items: result.order_items.map((item) => ({
            id: item.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: Number(item.unit_price),
            line_total: Number(item.line_total),
            revenue_model: item.revenue_model,
            promo_applied: item.promo_applied,
          })),
          vendor_sub_orders: result.sub_orders.map((so) => ({
            id: so.id,
            order_number: so.order_number,
            vendor_brand: so.vendor_brand ?? null,
            subtotal: Number(so.subtotal),
            item_count: so.order_items.length,
          })),
          notes: result.notes,
          created_at: result.created_at,
        },
      });
    },
  );

  /**
   * GET /api/orders
   * List orders with optional filters and pagination.
   */
  app.get(
    '/api/orders',
    {
      preHandler: [extractUser, requireRole('rep', 'manager', 'admin', 'viewer')],
    },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const user = request.user;

      if (!user) {
        void reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      const query = orderListQuerySchema.parse(request.query);

      const result = await listOrders(app.prisma, user.tenantId, {
        accountId: query.account_id,
        repId: query.rep_id,
        status: query.status,
        dateFrom: query.date_from,
        dateTo: query.date_to,
        minTotal: query.min_total,
        maxTotal: query.max_total,
        sortBy: query.sort_by,
        sortOrder: query.sort_order,
        excludeSubOrders: query.exclude_sub_orders,
        page: query.page,
        pageSize: query.per_page,
      });

      void reply.status(200).send({
        data: result.items,
        pagination: {
          page: result.page,
          per_page: result.pageSize,
          total_count: result.total,
          total_pages: Math.ceil(result.total / result.pageSize),
        },
      });
    },
  );

  /**
   * GET /api/orders/pending-approval
   * List orders awaiting manager approval (FR-017).
   */
  app.get(
    '/api/orders/pending-approval',
    {
      preHandler: [extractUser, requireRole('manager', 'admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const user = request.user;

      if (!user) {
        void reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      const query = pendingApprovalQuerySchema.parse(request.query);

      const result = await listPendingApproval(app.prisma, user.tenantId, {
        repId: query.rep_id,
        page: query.page,
        pageSize: query.per_page,
      });

      void reply.status(200).send({
        data: result.items,
        pagination: {
          page: result.page,
          per_page: result.pageSize,
          total_count: result.total,
        },
      });
    },
  );

  /**
   * GET /api/orders/:id
   * Get order detail by ID.
   */
  app.get<{ Params: { id: string } }>(
    '/api/orders/:id',
    {
      preHandler: [extractUser, requireRole('rep', 'manager', 'admin', 'viewer')],
    },
    async (request, reply): Promise<void> => {
      const user = request.user;

      if (!user) {
        void reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      const order = await getOrderById(
        app.prisma,
        user.tenantId,
        request.params.id,
      );

      if (!order) {
        void reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Order not found',
          code: 'NOT_FOUND',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      void reply.status(200).send({ data: order });
    },
  );

  /**
   * PATCH /api/orders/:id
   * Update order notes or cancel.
   */
  app.patch<{ Params: { id: string } }>(
    '/api/orders/:id',
    {
      preHandler: [extractUser, requireRole('rep', 'manager', 'admin')],
    },
    async (request, reply): Promise<void> => {
      const user = request.user;

      if (!user) {
        void reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      const body = updateOrderSchema.parse(request.body);

      const order = await updateOrder(
        app.prisma,
        user.tenantId,
        request.params.id,
        body,
        user.userId,
        user.email,
      );

      if (!order) {
        void reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Order not found',
          code: 'NOT_FOUND',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      void reply.status(200).send({ data: order });
    },
  );

  /**
   * POST /api/orders/:id/approve
   * Approve an order requiring manager approval (FR-017).
   */
  app.post<{ Params: { id: string } }>(
    '/api/orders/:id/approve',
    {
      preHandler: [extractUser, requireRole('manager', 'admin')],
    },
    async (request, reply): Promise<void> => {
      const user = request.user;

      if (!user) {
        void reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      const body = approveOrderSchema.parse(request.body ?? {});

      const order = await approveOrder(
        app.prisma,
        user.tenantId,
        request.params.id,
        user.userId,
        user.email,
        body.notes,
      );

      void reply.status(200).send({
        data: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          approved_by_id: order.approved_by_id,
          approved_at: order.approved_at,
        },
      });
    },
  );

  /**
   * POST /api/orders/:id/reject
   * Reject an order with reason (FR-017).
   */
  app.post<{ Params: { id: string } }>(
    '/api/orders/:id/reject',
    {
      preHandler: [extractUser, requireRole('manager', 'admin')],
    },
    async (request, reply): Promise<void> => {
      const user = request.user;

      if (!user) {
        void reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      const body = rejectOrderSchema.parse(request.body);

      const order = await rejectOrder(
        app.prisma,
        user.tenantId,
        request.params.id,
        user.userId,
        user.email,
        body.reason,
      );

      void reply.status(200).send({
        data: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          rejection_reason: order.rejection_reason,
        },
      });
    },
  );

  /**
   * POST /api/orders/:id/confirm
   * Confirm an approved order (FR-013, FR-023).
   */
  app.post<{ Params: { id: string } }>(
    '/api/orders/:id/confirm',
    {
      preHandler: [extractUser, requireRole('rep', 'manager', 'admin')],
    },
    async (request, reply): Promise<void> => {
      const user = request.user;

      if (!user) {
        void reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      const order = await confirmOrder(
        app.prisma,
        user.tenantId,
        request.params.id,
        user.userId,
        user.email,
      );

      void reply.status(200).send({
        data: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          confirmed_at: order.confirmed_at,
        },
      });
    },
  );
}
