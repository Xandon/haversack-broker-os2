import type { PrismaClient } from '@prisma/client';
import pino from 'pino';

const logger = pino({ name: 'business-rule-action' });

/**
 * Business Rule Action Dispatcher (FR-028)
 *
 * Dispatches THEN actions: notification, update_field, create_task, send_email.
 * Action schema:
 * {
 *   type: 'send_notification' | 'update_field' | 'create_task' | 'send_email',
 *   config: { ... }  // type-specific configuration
 * }
 */

export interface RuleAction {
  type: 'send_notification' | 'update_field' | 'create_task' | 'send_email';
  config: Record<string, unknown>;
}

export interface ActionContext {
  tenantId: string;
  entityType: string;
  entityId: string;
  entityData: Record<string, unknown>;
  ruleId: string;
  ruleName: string;
}

export async function executeActions(
  prisma: PrismaClient,
  actions: RuleAction[],
  context: ActionContext,
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'send_notification':
          await executeSendNotification(prisma, action.config, context);
          break;
        case 'update_field':
          await executeUpdateField(prisma, action.config, context);
          break;
        case 'create_task':
          await executeCreateTask(prisma, action.config, context);
          break;
        case 'send_email':
          // Email actions are logged but not actually sent in this implementation.
          // A real implementation would dispatch to the email service.
          logger.info({ ruleId: context.ruleId, action: 'send_email' }, 'Email action triggered (stub)');
          break;
        default:
          errors.push(`Unknown action type: ${action.type}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Action ${action.type} failed: ${message}`);
      logger.error({ ruleId: context.ruleId, action: action.type, error: message }, 'Rule action failed');
    }
  }

  return { success: errors.length === 0, errors };
}

async function executeSendNotification(
  prisma: PrismaClient,
  config: Record<string, unknown>,
  context: ActionContext,
): Promise<void> {
  const recipientId = resolveRecipient(config, context);
  if (!recipientId) return;

  await prisma.notification.create({
    data: {
      tenantId: context.tenantId,
      userId: recipientId,
      type: 'task_assigned', // closest matching NotificationType
      title: (config['title'] as string) ?? `Rule triggered: ${context.ruleName}`,
      message: (config['message'] as string) ?? `Business rule "${context.ruleName}" matched on ${context.entityType} ${context.entityId}`,
      isRead: false,
    },
  });
}

async function executeUpdateField(
  prisma: PrismaClient,
  config: Record<string, unknown>,
  context: ActionContext,
): Promise<void> {
  const fieldName = config['field'] as string | undefined;
  const fieldValue = config['value'];

  if (!fieldName) return;

  const MODEL_MAP: Record<string, string> = {
    Account: 'account',
    Order: 'order',
    Contact: 'contact',
    Opportunity: 'opportunity',
  };

  const modelName = MODEL_MAP[context.entityType];
  if (!modelName) return;

  const model = (prisma as Record<string, unknown>)[modelName] as {
    update: (args: Record<string, unknown>) => Promise<unknown>;
  } | undefined;

  if (!model) return;

  await model.update({
    where: { id: context.entityId },
    data: { [fieldName]: fieldValue },
  });
}

async function executeCreateTask(
  prisma: PrismaClient,
  config: Record<string, unknown>,
  context: ActionContext,
): Promise<void> {
  const assigneeId = resolveRecipient(config, context);
  if (!assigneeId) return;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + ((config['dueDays'] as number) ?? 7));

  await prisma.task.create({
    data: {
      tenantId: context.tenantId,
      createdById: assigneeId,
      assignedToId: assigneeId,
      accountId: context.entityType === 'Account' ? context.entityId : null,
      title: (config['title'] as string) ?? `Action required: ${context.ruleName}`,
      description: (config['description'] as string) ?? `Automatically created by business rule "${context.ruleName}"`,
      priority: (config['priority'] as string) ?? 'medium',
      dueDate,
    },
  });
}

function resolveRecipient(
  config: Record<string, unknown>,
  context: ActionContext,
): string | null {
  // Direct user ID
  if (config['recipientId'] && typeof config['recipientId'] === 'string') {
    return config['recipientId'];
  }

  // assignedRep from entity data
  if (config['recipient'] === 'assignedRep') {
    return (context.entityData['assignedRepId'] as string) ?? null;
  }

  return null;
}
