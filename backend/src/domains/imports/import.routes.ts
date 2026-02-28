import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { createImportService } from './import.service';
import type { ImportEntityType } from './import.service';

const importEntityTypeSchema = z.enum(['account', 'contact', 'product', 'order']);

const validateSchema = z.object({
  entityType: importEntityTypeSchema,
  rows: z.array(z.record(z.string())),
});

const importSchema = z.object({
  entityType: importEntityTypeSchema,
  rows: z.array(z.record(z.string())),
  assignedRepId: z.string().uuid().optional(),
  territoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
});

export function importRoutes(fastify: FastifyInstance): void {
  const service = createImportService(fastify.prisma);

  fastify.get('/api/imports/fields/:entityType', async (request, reply) => {
    const { entityType } = request.params as { entityType: string };
    const parsed = importEntityTypeSchema.safeParse(entityType);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid entity type', statusCode: 400 });
    }
    const fields = service.getFieldDefinitions(parsed.data as ImportEntityType);
    return reply.send({ data: fields });
  });

  fastify.post('/api/imports/validate', async (request, reply) => {
    const body = validateSchema.parse(request.body);
    const preview = service.validateData(body.entityType as ImportEntityType, body.rows);
    return reply.send({ data: preview });
  });

  fastify.post('/api/imports/execute', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
    }

    const body = importSchema.parse(request.body);
    const result = await service.importData(
      tenantId,
      body.entityType as ImportEntityType,
      body.rows,
      body.assignedRepId,
      body.territoryId,
      body.brandId,
    );

    return reply.send({ data: result });
  });
}
