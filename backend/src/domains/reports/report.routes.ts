import {
  runReportSchema,
  exportReportSchema,
  reportEntityTypeSchema,
  REPORT_ENTITY_COLUMNS,
} from '@haversack/shared';
import { FastifyInstance } from 'fastify';

import { createReportService } from './report.service';

export function reportRoutes(fastify: FastifyInstance): void {
  const service = createReportService(fastify.prisma);

  fastify.get('/api/reports/columns/:entityType', async (request, reply) => {
    const { entityType } = request.params as { entityType: string };
    const parsed = reportEntityTypeSchema.safeParse(entityType);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid entity type', statusCode: 400 });
    }
    const columns = REPORT_ENTITY_COLUMNS[parsed.data] ?? [];
    return reply.send({ data: columns });
  });

  fastify.post('/api/reports/run', async (request, reply) => {
    const body = runReportSchema.parse(request.body);
    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
    }

    const result = await service.runReport(
      tenantId,
      body.entityType,
      body.filters,
      body.columns,
      body.sortBy,
      body.sortOrder,
      body.page,
      body.limit,
    );

    return reply.send({ data: result });
  });

  fastify.post('/api/reports/export', async (request, reply) => {
    const body = exportReportSchema.parse(request.body);
    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
    }

    const rows = await service.exportReport(
      tenantId,
      body.entityType,
      body.filters,
      body.columns,
      body.sortBy,
      body.sortOrder,
    );

    const columnDefs = REPORT_ENTITY_COLUMNS[body.entityType] ?? [];
    const selectedColumns = columnDefs.filter((c) => body.columns.includes(c.key));

    if (body.format === 'csv') {
      const headers = selectedColumns.map((c) => c.label).join(',');
      const csvRows = rows.map((row) =>
        selectedColumns
          .map((c) => {
            const val = row[c.key];
            const str = val == null ? '' : String(val);
            return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
          })
          .join(','),
      );
      const csv = [headers, ...csvRows].join('\n');

      return reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', `attachment; filename="report-${body.entityType}.csv"`)
        .send(csv);
    }

    // XLSX format — return JSON with metadata (client-side XLSX generation)
    return reply.send({
      data: {
        columns: selectedColumns,
        rows,
        entityType: body.entityType,
        format: body.format,
      },
    });
  });
}
