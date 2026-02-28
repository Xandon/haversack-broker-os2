import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { createAiService } from './ai.service';
import type { AiProvider } from './ai.service';

const meetingBriefSchema = z.object({
  accountId: z.string().uuid(),
});

const activitySummarySchema = z.object({
  accountId: z.string().uuid(),
  period: z.enum(['week', 'month', 'quarter']).default('month'),
});

const emailDraftSchema = z.object({
  accountId: z.string().uuid(),
  purpose: z.string().min(1).max(500),
});

function createStubProvider(): AiProvider {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async generateText(prompt: string, systemPrompt: string): Promise<string> {
      return JSON.stringify({
        keyContacts: [],
        recentActivitySummary: 'AI service not configured.',
        orderTrends: 'AI service not configured.',
        suggestedTalkingPoints: ['Configure AI provider to enable this feature.'],
        subject: 'Draft Subject',
        body: 'AI service not configured. Please configure an AI provider.',
      });
    },
  };
}

export function aiRoutes(fastify: FastifyInstance): void {
  const provider = createStubProvider();
  const service = createAiService(fastify.prisma, provider);

  fastify.post('/api/ai/meeting-brief', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
    }

    const body = meetingBriefSchema.parse(request.body);

    try {
      const brief = await service.generateMeetingBrief(tenantId, body.accountId);
      return reply.send({ data: brief });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI service temporarily unavailable';
      return reply.status(503).send({
        error: 'AI service temporarily unavailable — please try again in a few minutes',
        detail: message,
        statusCode: 503,
      });
    }
  });

  fastify.post('/api/ai/activity-summary', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
    }

    const body = activitySummarySchema.parse(request.body);

    try {
      const summary = await service.generateActivitySummary(tenantId, body.accountId, body.period);
      return reply.send({ data: summary });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI service temporarily unavailable';
      return reply.status(503).send({
        error: 'AI service temporarily unavailable — please try again in a few minutes',
        detail: message,
        statusCode: 503,
      });
    }
  });

  fastify.post('/api/ai/email-draft', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
    }

    const body = emailDraftSchema.parse(request.body);

    try {
      const draft = await service.generateEmailDraft(tenantId, body.accountId, body.purpose);
      return reply.send({ data: draft });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI service temporarily unavailable';
      return reply.status(503).send({
        error: 'AI service temporarily unavailable — please try again in a few minutes',
        detail: message,
        statusCode: 503,
      });
    }
  });
}
