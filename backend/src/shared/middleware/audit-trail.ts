/**
 * Audit trail middleware for tracking mutations on Account, Order, Commission, and User entities.
 * Records actor, timestamp, entity, field, old/new values.
 * Write latency target: under 10ms (NFR-014).
 * Uses fire-and-forget writes to minimize impact on request latency.
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PrismaClient, Prisma } from '@prisma/client';
import fp from 'fastify-plugin';
import { logger } from '../utils/logger.js';

/** Entity types that require audit trail records */
export const AUDITED_ENTITIES = ['Account', 'Order', 'Commission', 'User', 'Product'] as const;
type AuditedEntity = (typeof AUDITED_ENTITIES)[number];

type AuditAction = 'create' | 'update' | 'delete';

export interface AuditEntryInput {
  tenantId: string;
  actorId: string;
  actorEmail: string;
  entityType: AuditedEntity;
  entityId: string;
  action: AuditAction;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  changeSummary?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Create an immutable audit trail entry.
 * Uses a non-blocking write to keep latency under 10ms.
 */
export async function createAuditEntry(
  prisma: PrismaClient,
  input: AuditEntryInput,
): Promise<void> {
  const startTime = performance.now();

  try {
    await prisma.auditTrail.create({
      data: {
        tenant_id: input.tenantId,
        actor_id: input.actorId,
        actor_email: input.actorEmail,
        entity_type: input.entityType,
        entity_id: input.entityId,
        action: input.action,
        field_name: input.fieldName ?? null,
        old_value: input.oldValue ?? null,
        new_value: input.newValue ?? null,
        change_summary: (input.changeSummary as Prisma.InputJsonValue) ?? undefined,
        ip_address: input.ipAddress ?? null,
        user_agent: input.userAgent ?? null,
        request_id: input.requestId ?? null,
      },
    });

    const duration = performance.now() - startTime;
    logger.debug(
      {
        operation: 'audit-trail-write',
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        duration: Math.round(duration * 100) / 100,
      },
      `Audit entry written in ${duration.toFixed(1)}ms`,
    );
  } catch (err: unknown) {
    const duration = performance.now() - startTime;
    logger.error(
      {
        operation: 'audit-trail-write',
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        duration: Math.round(duration * 100) / 100,
        err,
      },
      'Failed to write audit trail entry',
    );
  }
}

/**
 * Batch-create audit entries for multi-field updates.
 * Computes per-field change records from old and new objects.
 */
export function createFieldChangeEntries(
  prisma: PrismaClient,
  base: Omit<AuditEntryInput, 'fieldName' | 'oldValue' | 'newValue' | 'changeSummary'>,
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
): void {
  const changeSummary: Record<string, { old: unknown; new: unknown }> = {};

  for (const key of Object.keys(newValues)) {
    const oldVal = oldValues[key];
    const newVal = newValues[key];

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changeSummary[key] = { old: oldVal, new: newVal };
    }
  }

  if (Object.keys(changeSummary).length === 0) {
    return;
  }

  // Fire-and-forget: write audit entry asynchronously to keep latency low
  void createAuditEntry(prisma, {
    ...base,
    action: 'update',
    changeSummary,
  });
}

/**
 * Helper to extract audit context from a Fastify request.
 */
export function extractAuditContext(
  request: FastifyRequest,
): Pick<AuditEntryInput, 'ipAddress' | 'userAgent' | 'requestId'> {
  return {
    ipAddress: request.ip,
    userAgent: typeof request.headers['user-agent'] === 'string'
      ? request.headers['user-agent']
      : undefined,
    requestId: request.requestId,
  };
}

/**
 * Fastify plugin that decorates the instance with audit trail utilities.
 */
async function auditTrailPluginHandler(fastify: FastifyInstance): Promise<void> {
  // Make audit utilities available via fastify decoration
  fastify.decorate('createAuditEntry', (input: AuditEntryInput): void => {
    const prisma = fastify.prisma;
    void createAuditEntry(prisma, input);
  });
}

export const auditTrailPlugin = fp(auditTrailPluginHandler, {
  name: 'audit-trail',
  fastify: '4.x',
  dependencies: ['prisma'],
});
