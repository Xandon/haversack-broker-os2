import type { FastifyInstance } from 'fastify';
import {
  createAccountSchema,
  updateAccountSchema,
  accountListQuerySchema,
  duplicateCheckQuerySchema,
  createContactSchema,
  updateContactSchema,
  ERROR_CODES,
} from '@haversack/shared';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import {
  createAccount,
  getAccountById,
  updateAccount,
  softDeleteAccount,
  listAccounts,
  AccountError,
} from './account.service';
import { searchAccounts } from './account-search.service';
import { checkDuplicates } from './duplicate.service';
import { createContact, updateContact, softDeleteContact } from './contact.service';

function getAuditContext(request: { user?: { userId: string; email: string }; requestId: string; ip: string; headers: Record<string, string | string[] | undefined> }): {
  actorId: string;
  actorEmail: string;
  ipAddress: string;
  userAgent: string;
  requestId: string;
} {
  return {
    actorId: request.user!.userId,
    actorEmail: request.user!.email,
    ipAddress: request.ip,
    userAgent: (request.headers['user-agent'] as string) ?? '',
    requestId: request.requestId,
  };
}

function handleAccountError(
  error: unknown,
  requestId: string,
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
): unknown {
  if (error instanceof AccountError) {
    const statusMap: Record<string, number> = {
      ACCOUNT_NOT_FOUND: 404,
      CONTACT_NOT_FOUND: 404,
      ACCOUNT_CONFLICT: 409,
      ACCOUNT_DUPLICATE_DETECTED: 409,
      ACCOUNT_CIRCULAR_HIERARCHY: 400,
      ACCOUNT_TERRITORY_MISMATCH: 400,
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

export async function accountRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/accounts/check-duplicates — must be before :id route
  app.get(
    '/api/accounts/check-duplicates',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      const query = duplicateCheckQuerySchema.parse(request.query);
      const tenantId = request.user!.tenantId;

      const result = await checkDuplicates(
        app.prisma,
        tenantId,
        query.name,
        query.phone,
        query.streetAddress,
      );

      return reply.status(200).send({ data: result });
    },
  );

  // POST /api/accounts
  app.post(
    '/api/accounts',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      const body = createAccountSchema.parse(request.body);
      const tenantId = request.user!.tenantId;

      // Check for duplicates unless explicitly skipped
      if (!body.skipDuplicateCheck) {
        const duplicateResult = await checkDuplicates(
          app.prisma,
          tenantId,
          body.name,
          body.primaryContact.phone,
          body.streetAddress,
        );

        if (duplicateResult.hasDuplicates) {
          return reply.status(409).send({
            error: 'DUPLICATE_DETECTED',
            message: 'Potential duplicate accounts found',
            code: ERROR_CODES.ACCOUNT_DUPLICATE_DETECTED,
            requestId: request.requestId,
            duplicates: duplicateResult.duplicates,
          });
        }
      }

      try {
        const account = await createAccount(
          app.prisma,
          tenantId,
          body,
          getAuditContext(request),
        );

        return reply.status(201).send({ data: account });
      } catch (error: unknown) {
        return handleAccountError(error, request.requestId, reply);
      }
    },
  );

  // GET /api/accounts
  app.get(
    '/api/accounts',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const query = accountListQuerySchema.parse(request.query);
      const tenantId = request.user!.tenantId;

      // If search query provided, use search service
      if (query.search) {
        const result = await searchAccounts(app.prisma, tenantId, {
          query: query.search,
          territoryId: query.territoryId,
          accountType: query.accountType,
          limit: query.limit,
          cursor: query.cursor,
        });
        return reply.status(200).send(result);
      }

      // Otherwise use list with filters
      const result = await listAccounts(app.prisma, tenantId, {
        territoryId: query.territoryId,
        accountType: query.accountType,
        healthScoreMin: query.healthScoreMin,
        healthScoreMax: query.healthScoreMax,
        parentAccountId: query.parentAccountId,
        includeDeleted: query.includeDeleted,
        cursor: query.cursor,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });

      return reply.status(200).send(result);
    },
  );

  // GET /api/accounts/:id
  app.get(
    '/api/accounts/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      try {
        const account = await getAccountById(app.prisma, tenantId, id);
        return reply.status(200).send({ data: account });
      } catch (error: unknown) {
        return handleAccountError(error, request.requestId, reply);
      }
    },
  );

  // PUT /api/accounts/:id
  app.put(
    '/api/accounts/:id',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateAccountSchema.parse(request.body);
      const tenantId = request.user!.tenantId;
      const ifMatch = request.headers['if-match'] as string | undefined;

      try {
        const account = await updateAccount(
          app.prisma,
          tenantId,
          id,
          body,
          ifMatch,
          getAuditContext(request),
        );

        return reply.status(200).send({ data: account });
      } catch (error: unknown) {
        return handleAccountError(error, request.requestId, reply);
      }
    },
  );

  // DELETE /api/accounts/:id
  app.delete(
    '/api/accounts/:id',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      try {
        const result = await softDeleteAccount(
          app.prisma,
          tenantId,
          id,
          getAuditContext(request),
        );

        return reply.status(200).send({ data: result });
      } catch (error: unknown) {
        return handleAccountError(error, request.requestId, reply);
      }
    },
  );

  // POST /api/accounts/:id/contacts
  app.post(
    '/api/accounts/:id/contacts',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = createContactSchema.parse(request.body);
      const tenantId = request.user!.tenantId;

      try {
        const contact = await createContact(
          app.prisma,
          tenantId,
          id,
          body,
          getAuditContext(request),
        );

        return reply.status(201).send({ data: contact });
      } catch (error: unknown) {
        return handleAccountError(error, request.requestId, reply);
      }
    },
  );

  // PUT /api/accounts/:id/contacts/:contactId
  app.put(
    '/api/accounts/:id/contacts/:contactId',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      const { id, contactId } = request.params as { id: string; contactId: string };
      const body = updateContactSchema.parse(request.body);
      const tenantId = request.user!.tenantId;

      try {
        const contact = await updateContact(
          app.prisma,
          tenantId,
          id,
          contactId,
          body,
          getAuditContext(request),
        );

        return reply.status(200).send({ data: contact });
      } catch (error: unknown) {
        return handleAccountError(error, request.requestId, reply);
      }
    },
  );

  // DELETE /api/accounts/:id/contacts/:contactId
  app.delete(
    '/api/accounts/:id/contacts/:contactId',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      const { id, contactId } = request.params as { id: string; contactId: string };
      const tenantId = request.user!.tenantId;

      try {
        const result = await softDeleteContact(
          app.prisma,
          tenantId,
          id,
          contactId,
          getAuditContext(request),
        );

        return reply.status(200).send({ data: result });
      } catch (error: unknown) {
        return handleAccountError(error, request.requestId, reply);
      }
    },
  );
}
