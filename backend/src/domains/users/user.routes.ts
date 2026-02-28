import { createUserSchema, updateUserSchema, uuidSchema } from '@haversack/shared';
import { FastifyInstance } from 'fastify';

import { createUserService } from './user.service.js';

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  const service = createUserService(fastify.prisma);

  // List users (admin/manager only)
  fastify.get(
    '/api/users',
    {
      preHandler: [fastify.authenticate, fastify.authorize('admin', 'manager')],
    },
    async (request, reply) => {
      const { includeInactive } = request.query as { includeInactive?: string };
      const users = await service.list(request.user.tenantId, includeInactive === 'true');
      return reply.send({ data: users });
    },
  );

  // Get single user
  fastify.get(
    '/api/users/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      uuidSchema.parse(id);

      const user = await service.getById(request.user.tenantId, id);
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }
      return reply.send({ data: user });
    },
  );

  // Create user (admin only)
  fastify.post(
    '/api/users',
    {
      preHandler: [fastify.authenticate, fastify.authorize('admin')],
    },
    async (request, reply) => {
      const input = createUserSchema.parse(request.body);

      // Check email uniqueness
      const isUnique = await service.checkEmailUnique(request.user.tenantId, input.email);
      if (!isUnique) {
        return reply.status(409).send({ error: 'Email already in use' });
      }

      const user = await service.create(request.user.tenantId, input);
      return reply.status(201).send({ data: user });
    },
  );

  // Update user (admin only)
  fastify.patch(
    '/api/users/:id',
    {
      preHandler: [fastify.authenticate, fastify.authorize('admin')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      uuidSchema.parse(id);
      const input = updateUserSchema.parse(request.body);

      const existing = await service.getById(request.user.tenantId, id);
      if (!existing) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const user = await service.update(request.user.tenantId, id, input);
      return reply.send({ data: user });
    },
  );

  // Deactivate user (admin only)
  fastify.post(
    '/api/users/:id/deactivate',
    {
      preHandler: [fastify.authenticate, fastify.authorize('admin')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      uuidSchema.parse(id);

      // Prevent self-deactivation
      if (id === request.user.userId) {
        return reply.status(400).send({ error: 'Cannot deactivate your own account' });
      }

      const existing = await service.getById(request.user.tenantId, id);
      if (!existing) {
        return reply.status(404).send({ error: 'User not found' });
      }

      await service.deactivate(request.user.tenantId, id);
      return reply.send({ message: 'User deactivated' });
    },
  );
}
