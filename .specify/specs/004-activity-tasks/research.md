# Research: Activity & Task Management

**Reference Domain:** accounts (backend/src/domains/accounts/)

## Decision 1: Domain Error Pattern

**Decision:** Follow AccountError pattern — create domain-specific error classes (ActivityError, TaskError, EmailRecordError) with error codes and a handleError utility per route file.

**Rationale:** Consistent with established codebase. The AccountError class + handleAccountError function in routes.ts provides clean separation between service-layer errors and HTTP responses.

**Pattern:**
```
class ActivityError extends Error { code: string }
function handleActivityError(error, requestId, reply) { ... }
```

## Decision 2: Route Structure

**Decision:** Separate route files per domain: `activity.routes.ts`, `task.routes.ts`, `email-record.routes.ts`. Timeline endpoint lives under activities domain since it aggregates activity data.

**Rationale:** account.routes.ts handles both accounts and contacts (nested resource). Activities and tasks are distinct enough to warrant separate route files. Keeps files under 200 lines.

**Pattern:**
- Routes use `preHandler: [authenticate, authorize(...)]`
- Zod validation via `schema.parse(request.body/query)`
- Tenant ID from `request.user!.tenantId`
- Audit context helper function per route file

## Decision 3: Service Function Signatures

**Decision:** All service functions take `(prisma: PrismaClient, tenantId: string, ...args, auditContext?)` signature.

**Rationale:** Direct match to account.service.ts pattern. Prisma client + tenant ID as first two params ensures consistent tenant isolation. AuditContext passed for CUD operations.

**Pattern:**
```typescript
export async function createActivity(
  prisma: PrismaClient,
  tenantId: string,
  data: CreateActivityInput,
  audit: AuditContext,
): Promise<Activity> { ... }
```

## Decision 4: Cursor-Based Pagination

**Decision:** Use the same cursor-based pagination as account list — cursor is the ID of the last item, combined with `createdAt`/`occurredAt` for stable ordering.

**Rationale:** Account list uses `cursor` + `limit` + `sortBy` + `sortOrder`. Timeline pagination is similar but always sorted by `occurredAt` desc.

**Pattern:**
```typescript
const items = await prisma.activity.findMany({
  where: { tenantId, accountId, ...(cursor ? { occurredAt: { lt: cursorDate } } : {}) },
  orderBy: { occurredAt: 'desc' },
  take: limit + 1, // fetch one extra to detect hasMore
});
```

## Decision 5: Worker Queue Pattern

**Decision:** Follow health-score.queue.ts pattern — separate queue config file with constants, separate job file with processor logic. Register in worker/src/index.ts.

**Rationale:** Established pattern in codebase. Task reminders use delayed jobs (not cron) — schedule individual jobs at specific timestamps using BullMQ's `delay` option.

**Pattern:**
```typescript
// Queue: task-reminder.queue.ts
export const TASK_REMINDER_QUEUE_NAME = 'task-reminder';
export interface TaskReminderJobData { taskId: string; tenantId: string; reminderType: '24h' | '1h' }

// Job: task-reminder.job.ts
export async function processTaskReminder(data: TaskReminderJobData): Promise<void> { ... }
```

## Decision 6: Audit Trail Integration

**Decision:** Use the existing `writeAuditLog` and `writeUpdateAuditLogs` from `shared/services/audit.service.ts` for all Activity, Task, and EmailRecord CUD operations.

**Rationale:** Direct reuse of existing infrastructure. Audit service already handles `detectChanges` for update diffing and batch audit log writes.

**Pattern:**
```typescript
await writeAuditLog({
  prisma, tenantId, actorId, actorEmail, entityType: 'Activity',
  entityId: activity.id, action: 'create', ...
});
```

## Decision 7: Timeline Aggregation Strategy

**Decision:** The timeline endpoint queries activities, email records, and tasks separately, then merges and sorts by timestamp in application code. Returns a polymorphic array with a `type` discriminator.

**Rationale:** A single database query across three tables would require a UNION which Prisma doesn't support natively. Separate queries allow independent filtering and can be parallelized with `Promise.all`. The merge is O(n) since each sub-query is pre-sorted.

**Alternatives Considered:**
- Database view with UNION ALL: Would require raw SQL, violating Prisma-only rule.
- Single timeline table (event sourcing): Adds complexity for minimal benefit at this scale.

**Pattern:**
```typescript
interface TimelineItem {
  id: string;
  type: 'activity' | 'email' | 'task';
  occurredAt: Date;
  data: Activity | EmailRecord | TaskEvent;
}
```
