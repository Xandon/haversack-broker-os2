/**
 * Account domain route handlers for Fastify.
 * POST   /api/accounts                — create account (rep, manager, admin)
 * GET    /api/accounts                — list accounts with filters/pagination
 * GET    /api/accounts/:id            — get account by ID
 * PUT    /api/accounts/:id            — update account (rep, manager, admin)
 * POST   /api/accounts/check-duplicates — check for duplicates without creating
 *
 * All routes require authentication and enforce tenant isolation.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import {
  createAccountSchema,
  updateAccountSchema,
  accountListQuerySchema,
} from '@haversack/shared';
import { extractUser, requireRole } from '../../auth/rbac.middleware.js';
import {
  createAccount,
  getAccountById,
  listAccounts,
  updateAccount,
} from './account.service.js';
import { findDuplicates } from './duplicate-detection.service.js';

export async function accountRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/accounts
   * Create a new account. Requires rep, manager, or admin role.
   */
  app.post(
    '/api/accounts',
    {
      preHandler: [extractUser, requireRole('rep', 'manager', 'admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const body = createAccountSchema.parse(request.body);
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

      const result = await createAccount(
        app.prisma,
        user.tenantId,
        body,
        user.userId,
        user.email,
      );

      void reply.status(201).send({
        data: result.account,
        duplicates: result.duplicates,
      });
    },
  );

  /**
   * GET /api/accounts
   * List accounts with optional filters and pagination.
   */
  app.get(
    '/api/accounts',
    {
      preHandler: [extractUser, requireRole('rep', 'manager', 'admin', 'logistics', 'viewer')],
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

      const query = accountListQuerySchema.parse(request.query);

      const result = await listAccounts(app.prisma, user.tenantId, {
        territoryId: query.territory_id,
        accountType: query.account_type,
        search: query.search,
        isActive: query.is_active,
        page: query.page,
        pageSize: query.page_size,
      });

      void reply.status(200).send({
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      });
    },
  );

  /**
   * GET /api/accounts/:id
   * Get a single account by ID with contacts.
   */
  app.get<{ Params: { id: string } }>(
    '/api/accounts/:id',
    {
      preHandler: [extractUser, requireRole('rep', 'manager', 'admin', 'logistics', 'viewer')],
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

      const account = await getAccountById(
        app.prisma,
        user.tenantId,
        request.params.id,
      );

      if (!account) {
        void reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Account not found',
          code: 'NOT_FOUND',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      void reply.status(200).send({ data: account });
    },
  );

  /**
   * PUT /api/accounts/:id
   * Update an existing account. Requires rep, manager, or admin role.
   */
  app.put<{ Params: { id: string } }>(
    '/api/accounts/:id',
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

      const body = updateAccountSchema.parse(request.body);

      const account = await updateAccount(
        app.prisma,
        user.tenantId,
        request.params.id,
        body,
        user.userId,
        user.email,
      );

      if (!account) {
        void reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Account not found',
          code: 'NOT_FOUND',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      void reply.status(200).send({ data: account });
    },
  );

  /**
   * POST /api/accounts/check-duplicates
   * Check for potential duplicate accounts without creating one.
   */
  app.post(
    '/api/accounts/check-duplicates',
    {
      preHandler: [extractUser, requireRole('rep', 'manager', 'admin')],
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

      const body = createAccountSchema.parse(request.body);

      const duplicates = await findDuplicates(app.prisma, user.tenantId, {
        name: body.name,
        phone: body.phone ?? undefined,
        address_line1: body.address_line1,
        city: body.city,
        state: body.state,
        zip_code: body.zip_code,
      });

      void reply.status(200).send({
        data: duplicates,
        hasDuplicates: duplicates.length > 0,
      });
    },
  );
}
