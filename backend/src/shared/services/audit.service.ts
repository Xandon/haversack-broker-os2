import type { PrismaClient, AuditAction, Prisma } from '@prisma/client';

export interface AuditLogParams {
  prisma: PrismaClient;
  tenantId: string;
  actorId: string;
  actorEmail: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  changeSummary?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  await params.prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      fieldName: params.fieldName ?? null,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
      changeSummary: params.changeSummary ?? undefined,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      requestId: params.requestId ?? null,
    },
  });
}

export interface FieldChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

export function detectChanges(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
): FieldChange[] {
  const changes: FieldChange[] = [];

  for (const key of Object.keys(newData)) {
    const oldVal = oldData[key];
    const newVal = newData[key];

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field: key,
        oldValue: oldVal != null ? String(oldVal) : null,
        newValue: newVal != null ? String(newVal) : null,
      });
    }
  }

  return changes;
}

export async function writeUpdateAuditLogs(
  params: Omit<AuditLogParams, 'fieldName' | 'oldValue' | 'newValue' | 'action'>,
  changes: FieldChange[],
): Promise<void> {
  await Promise.all(
    changes.map((change) =>
      writeAuditLog({
        ...params,
        action: 'update',
        fieldName: change.field,
        oldValue: change.oldValue ?? undefined,
        newValue: change.newValue ?? undefined,
      }),
    ),
  );
}
