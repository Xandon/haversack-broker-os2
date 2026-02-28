import { FastifyInstance } from 'fastify';

import { createDashboardService } from './dashboard.service.js';

export async function dashboardRoutes(fastify: FastifyInstance): Promise<void> {
  const service = createDashboardService(fastify.prisma);

  // Get Rep KPI dashboard data
  fastify.get(
    '/api/dashboard/rep',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { repId } = request.query as { repId?: string };
      const targetRepId = repId ?? request.user.userId;

      const kpiData = await service.getRepKpi(request.user.tenantId, targetRepId);
      return reply.send(kpiData);
    },
  );

  // Get Team dashboard data (Manager/Admin)
  fastify.get(
    '/api/dashboard/team',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { start, end } = request.query as { start?: string; end?: string };

      const dateRange = start && end ? { start, end } : undefined;

      const dashboardData = await service.getTeamDashboard(request.user.tenantId, dateRange);
      return reply.send(dashboardData);
    },
  );
}
