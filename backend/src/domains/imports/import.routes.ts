/**
 * Data import and data quality route handlers for Fastify.
 * POST   /api/v1/admin/import/upload          — upload CSV/XLSX for validation
 * GET    /api/v1/admin/import/:job_id/preview  — get validation preview
 * POST   /api/v1/admin/import/:job_id/execute  — execute import
 * GET    /api/v1/admin/import                   — list import jobs
 * GET    /api/v1/admin/data-quality             — get data quality scorecard
 * POST   /api/v1/admin/data-quality/recalculate — trigger recalculation
 *
 * Implements FR-031, FR-032, FR-033.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import {
  importUploadSchema,
  importExecuteSchema,
  importListQuerySchema,
  dataQualityQuerySchema,
} from '@haversack/shared';
import { extractUser, requireRole } from '../../auth/rbac.middleware.js';
import {
  createImportJob,
  listImportJobs,
  getImportJobById,
  executeImport,
  getDataQualityScorecard,
  calculateDataQuality,
  saveDataQualityScore,
  MAX_FILE_SIZE_BYTES,
} from './import.service.js';

export async function importRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/admin/import/upload
   * Upload a CSV/XLSX file for import validation (FR-031, FR-032).
   */
  app.post(
    '/api/v1/admin/import/upload',
    {
      preHandler: [extractUser, requireRole('admin')],
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

      const body = importUploadSchema.parse(request.body);

      // In a real implementation, file upload is handled via multipart form data.
      // For now we accept metadata and create the import job.
      const fileName = (request.body as Record<string, unknown>)['file_name'] as string ?? 'upload.csv';
      const fileSizeBytes = (request.body as Record<string, unknown>)['file_size_bytes'] as number ?? 0;

      // Check file size (FR-032)
      if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
        void reply.status(413).send({
          error: 'FILE_TOO_LARGE',
          message: 'Import file exceeds the 50 MB limit. Please reduce the file size and try again.',
          code: 'IMPORT_FILE_TOO_LARGE',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      const result = await createImportJob(
        app.prisma,
        user.tenantId,
        user.userId,
        body.entity_type,
        fileName,
        fileSizeBytes,
      );

      void reply.status(201).send({
        data: {
          import_job_id: result.id,
          file_name: result.file_name,
          file_size_bytes: result.file_size_bytes,
          entity_type: result.entity_type,
          status: result.status,
        },
      });
    },
  );

  /**
   * GET /api/v1/admin/import/:job_id/preview
   * Retrieve pre-import preview with validation results (FR-031).
   */
  app.get<{ Params: { job_id: string } }>(
    '/api/v1/admin/import/:job_id/preview',
    {
      preHandler: [extractUser, requireRole('admin')],
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

      const job = await getImportJobById(
        app.prisma,
        user.tenantId,
        request.params.job_id,
      );

      if (!job) {
        void reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Import job not found',
          code: 'NOT_FOUND',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      void reply.status(200).send({
        data: {
          import_job_id: job.id,
          entity_type: job.entity_type,
          status: job.status,
          summary: {
            total_rows: job.total_rows,
            valid_rows: job.valid_rows,
            error_rows: job.error_rows,
          },
          preview_data: job.preview_data,
        },
      });
    },
  );

  /**
   * POST /api/v1/admin/import/:job_id/execute
   * Execute the import for valid rows (FR-031).
   */
  app.post<{ Params: { job_id: string } }>(
    '/api/v1/admin/import/:job_id/execute',
    {
      preHandler: [extractUser, requireRole('admin')],
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

      const body = importExecuteSchema.parse(request.body ?? {});

      const result = await executeImport(
        app.prisma,
        user.tenantId,
        request.params.job_id,
        body.import_valid_only,
      );

      if (!result) {
        void reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Import job not found',
          code: 'NOT_FOUND',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      void reply.status(200).send({
        data: {
          import_job_id: result.id,
          status: result.status,
          imported_rows: result.imported_rows,
          skipped_rows: result.error_rows,
          error_log_url: result.error_log_url,
          completed_at: result.completed_at,
        },
      });
    },
  );

  /**
   * GET /api/v1/admin/import
   * List import jobs (FR-031).
   */
  app.get(
    '/api/v1/admin/import',
    {
      preHandler: [extractUser, requireRole('admin')],
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

      const query = importListQuerySchema.parse(request.query);

      const result = await listImportJobs(app.prisma, user.tenantId, {
        entityType: query.entity_type,
        status: query.status,
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
   * GET /api/v1/admin/data-quality
   * Retrieve the latest data quality scorecard (FR-033).
   */
  app.get(
    '/api/v1/admin/data-quality',
    {
      preHandler: [extractUser, requireRole('admin', 'manager')],
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

      dataQualityQuerySchema.parse(request.query);

      const scorecard = await getDataQualityScorecard(app.prisma, user.tenantId);

      if (!scorecard) {
        void reply.status(200).send({
          data: null,
          message: 'No data quality scorecard available yet. It will be calculated during the next nightly run.',
        });
        return;
      }

      void reply.status(200).send({
        data: {
          calculated_at: scorecard.calculatedAt,
          overall_score: scorecard.overallScore,
          metrics: {
            account_field_completeness_pct: scorecard.metrics.accountFieldCompletenessPct,
            contact_email_validity_pct: scorecard.metrics.contactEmailValidityPct,
            product_image_coverage_pct: scorecard.metrics.productImageCoveragePct,
            duplicate_account_count: scorecard.metrics.duplicateAccountCount,
            stale_account_count: scorecard.metrics.staleAccountCount,
          },
          trend: scorecard.trend,
        },
      });
    },
  );

  /**
   * POST /api/v1/admin/data-quality/recalculate
   * Trigger on-demand data quality recalculation (FR-033).
   */
  app.post(
    '/api/v1/admin/data-quality/recalculate',
    {
      preHandler: [extractUser, requireRole('admin')],
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

      // Calculate and save synchronously for on-demand requests
      const metrics = await calculateDataQuality(app.prisma, user.tenantId);
      await saveDataQualityScore(app.prisma, user.tenantId, metrics);

      void reply.status(202).send({
        message: 'Data quality recalculation completed',
        data: {
          overall_score: (
            metrics.accountFieldCompletenessPct * 0.3 +
            metrics.contactEmailValidityPct * 0.25 +
            metrics.productImageCoveragePct * 0.2 +
            Math.max(0, 100 - metrics.duplicateAccountCount * 2) * 0.15 +
            Math.max(0, 100 - metrics.staleAccountCount * 1) * 0.10
          ),
        },
      });
    },
  );
}
