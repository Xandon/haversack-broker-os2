import type { PrismaClient } from '@prisma/client';
import { validateConditions, evaluateConditions, type ConditionGroup } from './rule-condition.service';
import { executeActions, type RuleAction, type ActionContext } from './rule-action.service';
import { writeAuditLog } from '../../shared/services/audit.service';

export class BusinessRuleError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'BusinessRuleError';
    this.code = code;
  }
}

export interface CreateRuleInput {
  name: string;
  description?: string;
  entityType: string;
  conditions: ConditionGroup;
  actions: RuleAction[];
  priority?: number;
}

export interface UpdateRuleInput {
  name?: string;
  description?: string;
  conditions?: ConditionGroup;
  actions?: RuleAction[];
  priority?: number;
  status?: 'active' | 'inactive';
}

export interface AuditContext {
  actorId: string;
  actorEmail: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export async function createRule(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  input: CreateRuleInput,
  audit: AuditContext,
): Promise<Record<string, unknown>> {
  // Validate conditions against entity schema
  const validationErrors = validateConditions(input.entityType, input.conditions);
  if (validationErrors.length > 0) {
    throw new BusinessRuleError(validationErrors.join('; '), 'RULE_INVALID_CONDITIONS');
  }

  // Validate actions
  if (!input.actions || input.actions.length === 0) {
    throw new BusinessRuleError('At least one action is required', 'RULE_NO_ACTIONS');
  }

  const rule = await prisma.businessRule.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description ?? null,
      entityType: input.entityType,
      conditions: input.conditions as unknown as Record<string, unknown>,
      actions: input.actions as unknown as Record<string, unknown>[],
      priority: input.priority ?? 100,
      status: 'active',
      createdBy: userId,
    },
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'BusinessRule',
    entityId: rule.id,
    action: 'create',
    changeSummary: { name: input.name, entityType: input.entityType },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return rule as unknown as Record<string, unknown>;
}

export async function getRuleById(
  prisma: PrismaClient,
  tenantId: string,
  ruleId: string,
): Promise<Record<string, unknown>> {
  const rule = await prisma.businessRule.findFirst({
    where: { id: ruleId, tenantId },
    include: {
      creator: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!rule) {
    throw new BusinessRuleError('Business rule not found', 'RULE_NOT_FOUND');
  }

  return rule as unknown as Record<string, unknown>;
}

export async function listRules(
  prisma: PrismaClient,
  tenantId: string,
  filters?: { status?: string; entityType?: string },
): Promise<{ rules: Record<string, unknown>[]; total: number }> {
  const where: Record<string, unknown> = { tenantId };

  if (filters?.status) {
    where['status'] = filters.status;
  }
  if (filters?.entityType) {
    where['entityType'] = filters.entityType;
  }

  const [rules, total] = await Promise.all([
    prisma.businessRule.findMany({
      where,
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.businessRule.count({ where }),
  ]);

  return { rules: rules as unknown as Record<string, unknown>[], total };
}

export async function updateRule(
  prisma: PrismaClient,
  tenantId: string,
  ruleId: string,
  input: UpdateRuleInput,
  audit: AuditContext,
): Promise<Record<string, unknown>> {
  const existing = await prisma.businessRule.findFirst({
    where: { id: ruleId, tenantId },
  });

  if (!existing) {
    throw new BusinessRuleError('Business rule not found', 'RULE_NOT_FOUND');
  }

  if (input.conditions) {
    const validationErrors = validateConditions(existing.entityType, input.conditions);
    if (validationErrors.length > 0) {
      throw new BusinessRuleError(validationErrors.join('; '), 'RULE_INVALID_CONDITIONS');
    }
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data['name'] = input.name;
  if (input.description !== undefined) data['description'] = input.description;
  if (input.conditions !== undefined) data['conditions'] = input.conditions;
  if (input.actions !== undefined) data['actions'] = input.actions;
  if (input.priority !== undefined) data['priority'] = input.priority;
  if (input.status !== undefined) data['status'] = input.status;

  const updated = await prisma.businessRule.update({
    where: { id: ruleId },
    data,
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'BusinessRule',
    entityId: ruleId,
    action: 'update',
    changeSummary: data,
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return updated as unknown as Record<string, unknown>;
}

export async function deleteRule(
  prisma: PrismaClient,
  tenantId: string,
  ruleId: string,
  audit: AuditContext,
): Promise<void> {
  const existing = await prisma.businessRule.findFirst({
    where: { id: ruleId, tenantId },
  });

  if (!existing) {
    throw new BusinessRuleError('Business rule not found', 'RULE_NOT_FOUND');
  }

  await prisma.businessRule.delete({ where: { id: ruleId } });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'BusinessRule',
    entityId: ruleId,
    action: 'delete',
    changeSummary: { name: existing.name },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });
}

/**
 * Evaluates all active rules for a given entity type and entity data.
 * Used by workers/triggers to fire rules asynchronously.
 */
export async function evaluateRulesForEntity(
  prisma: PrismaClient,
  tenantId: string,
  entityType: string,
  entityId: string,
  entityData: Record<string, unknown>,
): Promise<{ fired: number; errors: string[] }> {
  const rules = await prisma.businessRule.findMany({
    where: {
      tenantId,
      entityType,
      status: 'active',
    },
    orderBy: { priority: 'asc' },
  });

  let fired = 0;
  const allErrors: string[] = [];

  for (const rule of rules) {
    const conditionGroup = rule.conditions as unknown as ConditionGroup;
    const matched = evaluateConditions(conditionGroup, entityData);

    if (matched) {
      const actions = rule.actions as unknown as RuleAction[];
      const context: ActionContext = {
        tenantId,
        entityType,
        entityId,
        entityData,
        ruleId: rule.id,
        ruleName: rule.name,
      };

      const result = await executeActions(prisma, actions, context);

      await prisma.businessRule.update({
        where: { id: rule.id },
        data: {
          lastFiredAt: new Date(),
          errorMessage: result.errors.length > 0 ? result.errors.join('; ') : null,
          status: result.errors.length > 0 ? 'error' : 'active',
        },
      });

      fired++;
      allErrors.push(...result.errors);
    }
  }

  return { fired, errors: allErrors };
}
