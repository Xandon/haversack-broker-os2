import type { FastifyInstance } from 'fastify';
import {
  createUserSchema,
  updateUserSchema,
  userListQuerySchema,
} from '@haversack/shared';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import {
  createUser,
  getUserById,
  listUsers,
  updateUser,
  deactivateUser,
  AdminError,
} from './user.service';

function getAuditContext(request: {
  user?: { userId: string; email: string };
  requestId: string;
  ip: string;
  headers: Record<string, string | string[] | undefined>;
}): {
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

function handleAdminError(
  error: unknown,
  requestId: string,
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
): unknown {
  if (error instanceof AdminError) {
    const statusMap: Record<string, number> = {
      USER_NOT_FOUND: 404,
      USER_EMAIL_DUPLICATE: 409,
      USER_SELF_DEACTIVATION: 400,
      USER_CONFLICT: 409,
      IMPORT_NOT_FOUND: 404,
      IMPORT_FILE_TOO_LARGE: 413,
      IMPORT_INVALID_FORMAT: 400,
      IMPORT_ALREADY_PROCESSING: 409,
      IMPORT_NOT_READY: 400,
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

export async function adminUserRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/admin/users
  app.post(
    '/api/admin/users',
    { preHandler: [authenticate, authorize('admin')] },
    async (request, reply) => {
      const body = createUserSchema.parse(request.body);
      const tenantId = request.user!.tenantId;

      try {
        const user = await createUser(app.prisma, tenantId, body, getAuditContext(request));
        return reply.status(201).send({ data: user });
      } catch (error: unknown) {
        return handleAdminError(error, request.requestId, reply);
      }
    },
  );

  // GET /api/admin/users
  app.get(
    '/api/admin/users',
    { preHandler: [authenticate, authorize('admin')] },
    async (request, reply) => {
      const query = userListQuerySchema.parse(request.query);
      const tenantId = request.user!.tenantId;

      const result = await listUsers(app.prisma, tenantId, {
        role: query.role,
        isActive: query.isActive,
        search: query.search,
        page: query.page,
        limit: query.limit,
      });

      return reply.status(200).send(result);
    },
  );

  // GET /api/admin/users/:id
  app.get(
    '/api/admin/users/:id',
    { preHandler: [authenticate, authorize('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      try {
        const user = await getUserById(app.prisma, tenantId, id);
        return reply.status(200).send({ data: user });
      } catch (error: unknown) {
        return handleAdminError(error, request.requestId, reply);
      }
    },
  );

  // PUT /api/admin/users/:id
  app.put(
    '/api/admin/users/:id',
    { preHandler: [authenticate, authorize('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateUserSchema.parse(request.body);
      const tenantId = request.user!.tenantId;
      const ifMatch = request.headers['if-match'] as string | undefined;

      try {
        const user = await updateUser(
          app.prisma,
          tenantId,
          id,
          body,
          ifMatch,
          getAuditContext(request),
        );
        return reply.status(200).send({ data: user });
      } catch (error: unknown) {
        return handleAdminError(error, request.requestId, reply);
      }
    },
  );

  // DELETE /api/admin/users/:id
  app.delete(
    '/api/admin/users/:id',
    { preHandler: [authenticate, authorize('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      try {
        const user = await deactivateUser(
          app.prisma,
          tenantId,
          id,
          getAuditContext(request),
        );
        return reply.status(200).send({ data: user });
      } catch (error: unknown) {
        return handleAdminError(error, request.requestId, reply);
      }
    },
  );
}
