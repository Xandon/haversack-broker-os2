import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import {
  importConfirmSchema,
  importHistoryQuerySchema,
  dataImportEntityTypeSchema,
  ADMIN_ERROR_CODES,
} from '@haversack/shared';
import { AdminError } from './user.service';
import {
  validateFileSize,
  parseUploadedFileAsync,
  validateImportData,
  createImportRecord,
  confirmImport,
  getImportById,
  listImports,
} from './import.service';
import { getLayoutOfTruth } from './layout-of-truth.service';

function handleImportError(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  if (error instanceof AdminError) {
    const statusMap: Record<string, number> = {
      [ADMIN_ERROR_CODES.IMPORT_NOT_FOUND]: 404,
      [ADMIN_ERROR_CODES.IMPORT_FILE_TOO_LARGE]: 413,
      [ADMIN_ERROR_CODES.IMPORT_INVALID_FORMAT]: 400,
      [ADMIN_ERROR_CODES.IMPORT_ALREADY_PROCESSING]: 409,
      [ADMIN_ERROR_CODES.IMPORT_NOT_READY]: 400,
    };
    const status = statusMap[error.code] ?? 400;
    return reply.status(status).send({
      error: error.code,
      message: error.message,
      code: error.code,
      requestId: request.requestId,
    });
  }
  throw error;
}

export async function adminImportRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/admin/imports/upload — multipart file upload
  app.post(
    '/api/admin/imports/upload',
    { preHandler: [authenticate, authorize('admin')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = await request.file();

        if (!data) {
          return reply.status(400).send({
            error: 'MISSING_FILE',
            message: 'No file uploaded',
            code: 'MISSING_FILE',
            requestId: request.requestId,
          });
        }

        const buffer = await data.toBuffer();
        validateFileSize(buffer.length);

        // Get entity type from fields
        const fields = data.fields as Record<
          string,
          { value: string } | undefined
        >;
        const entityTypeField = fields['entityType'];
        if (!entityTypeField) {
          return reply.status(400).send({
            error: 'MISSING_ENTITY_TYPE',
            message: 'entityType field is required',
            code: 'MISSING_ENTITY_TYPE',
            requestId: request.requestId,
          });
        }

        const entityTypeResult = dataImportEntityTypeSchema.safeParse(
          entityTypeField.value,
        );
        if (!entityTypeResult.success) {
          return reply.status(400).send({
            error: 'INVALID_ENTITY_TYPE',
            message: 'Invalid entity type. Allowed: account, contact, product, order',
            code: 'INVALID_ENTITY_TYPE',
            requestId: request.requestId,
          });
        }

        const entityType = entityTypeResult.data;
        const parsed = await parseUploadedFileAsync(buffer, data.filename);
        const preview = validateImportData(parsed.rows, entityType);

        const warnings = [...parsed.warnings, ...preview.warnings];

        const user = request.user as { userId: string; email: string };
        const importRecord = await createImportRecord(
          request.server.prisma,
          request.tenantId as string,
          {
            entityType,
            filename: data.filename,
            fileSize: buffer.length,
            totalRows: preview.totalRows,
            validRows: preview.validRows,
            errorRows: preview.errorRows,
            errors: preview.errors,
            warnings,
            parsedData: parsed.rows,
            createdById: user.userId,
          },
        );

        return reply.status(201).send({
          data: {
            id: importRecord['id'],
            status: 'previewed',
            entityType,
            filename: data.filename,
            totalRows: preview.totalRows,
            validRows: preview.validRows,
            errorRows: preview.errorRows,
            errors: preview.errors,
            warnings,
          },
        });
      } catch (error) {
        return handleImportError(error, request, reply);
      }
    },
  );

  // POST /api/admin/imports/:id/confirm
  app.post(
    '/api/admin/imports/:id/confirm',
    { preHandler: [authenticate, authorize('admin')] },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { skipErrors?: boolean };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const { id } = request.params;
        const body = importConfirmSchema.parse(request.body ?? {});
        const user = request.user as {
          userId: string;
          email: string;
        };

        const result = await confirmImport(
          request.server.prisma,
          request.tenantId as string,
          id,
          body.skipErrors,
          {
            actorId: user.userId,
            actorEmail: user.email,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            requestId: request.requestId,
          },
        );

        return reply.status(202).send({
          data: {
            id: result['id'],
            status: 'processing',
          },
        });
      } catch (error) {
        return handleImportError(error, request, reply);
      }
    },
  );

  // GET /api/admin/imports
  app.get(
    '/api/admin/imports',
    { preHandler: [authenticate, authorize('admin')] },
    async (
      request: FastifyRequest<{
        Querystring: Record<string, string>;
      }>,
      reply: FastifyReply,
    ) => {
      const query = importHistoryQuerySchema.parse(request.query);

      const result = await listImports(
        request.server.prisma,
        request.tenantId as string,
        {
          entityType: query.entityType,
          page: query.page,
          limit: query.limit,
        },
      );

      return reply.status(200).send(result);
    },
  );

  // GET /api/admin/imports/:id
  app.get(
    '/api/admin/imports/:id',
    { preHandler: [authenticate, authorize('admin')] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const record = await getImportById(
          request.server.prisma,
          request.tenantId as string,
          request.params.id,
        );

        return reply.status(200).send({ data: record });
      } catch (error) {
        return handleImportError(error, request, reply);
      }
    },
  );

  // GET /api/admin/layout-of-truth/:entityType
  app.get(
    '/api/admin/layout-of-truth/:entityType',
    { preHandler: [authenticate, authorize('admin')] },
    async (
      request: FastifyRequest<{ Params: { entityType: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const entityTypeResult = dataImportEntityTypeSchema.safeParse(
          request.params.entityType,
        );
        if (!entityTypeResult.success) {
          return reply.status(400).send({
            error: 'INVALID_ENTITY_TYPE',
            message:
              'Invalid entity type. Allowed: account, contact, product, order',
            code: 'INVALID_ENTITY_TYPE',
            requestId: request.requestId,
          });
        }

        const layout = getLayoutOfTruth(entityTypeResult.data);
        return reply.status(200).send({ data: layout });
      } catch (error) {
        return handleImportError(error, request, reply);
      }
    },
  );
}
