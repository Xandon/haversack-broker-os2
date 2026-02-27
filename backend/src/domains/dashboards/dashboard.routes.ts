import type { FastifyInstance } from 'fastify';
import {
  dashboardDateQuerySchema,
  revenueByMonthQuerySchema,
} from '@haversack/shared';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import { getRepDashboard, getCriticalAccounts } from './rep-dashboard.service';
import {
  getTeamDashboard,
  getRevenueByMonth,
  getPipelineForecast,
  getTerritoryRevenue,
} from './team-dashboard.service';

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  // ── Rep Dashboard ───────────────────────────────────────────

  app.get(
    '/api/dashboards/rep',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const query = dashboardDateQuerySchema.parse(request.query);
      const tenantId = request.user!.tenantId;
      const userId = request.user!.userId;

      const result = await getRepDashboard(
        request.server.prisma,
        tenantId,
        userId,
        query,
      );

      return reply.status(200).send({ data: result });
    },
  );

  app.get(
    '/api/dashboards/rep/critical-accounts',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.userId;

      const accounts = await getCriticalAccounts(
        request.server.prisma,
        tenantId,
        userId,
      );

      return reply.status(200).send({ data: accounts, count: accounts.length });
    },
  );

  // ── Team Dashboard ──────────────────────────────────────────

  app.get(
    '/api/dashboards/team',
    { preHandler: [authenticate, authorize('manager')] },
    async (request, reply) => {
      const query = dashboardDateQuerySchema.parse(request.query);
      const tenantId = request.user!.tenantId;

      const result = await getTeamDashboard(
        request.server.prisma,
        tenantId,
        query,
      );

      return reply.status(200).send({ data: result });
    },
  );

  app.get(
    '/api/dashboards/team/revenue-by-month',
    { preHandler: [authenticate, authorize('manager')] },
    async (request, reply) => {
      const query = revenueByMonthQuerySchema.parse(request.query);
      const tenantId = request.user!.tenantId;

      const result = await getRevenueByMonth(
        request.server.prisma,
        tenantId,
        query.months,
      );

      return reply.status(200).send({ data: result });
    },
  );

  app.get(
    '/api/dashboards/team/pipeline-forecast',
    { preHandler: [authenticate, authorize('manager')] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      const result = await getPipelineForecast(
        request.server.prisma,
        tenantId,
      );

      return reply.status(200).send({ data: result });
    },
  );

  app.get(
    '/api/dashboards/team/territory-revenue',
    { preHandler: [authenticate, authorize('manager')] },
    async (request, reply) => {
      const query = dashboardDateQuerySchema.parse(request.query);
      const tenantId = request.user!.tenantId;

      const result = await getTerritoryRevenue(
        request.server.prisma,
        tenantId,
        query,
      );

      return reply.status(200).send({ data: result });
    },
  );
}
