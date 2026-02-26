# Tasks: Activity & Task Management

**Feature:** Activity & Task Management (Feature 3)
**Spec:** .specify/specs/004-activity-tasks/spec.md
**Starting Task:** T043
**Starting Batch:** 7

## Batch 7: Schema, Shared Types & Core Activity Service

**Branch:** `feature/batch-7-activity-schema`
**Tasks:** T043–T051 (9 tasks)
**Focus:** Prisma schema, shared Zod schemas, activity CRUD service, activity routes

### US-1: Quick Activity Logging (P1)

- **T043**: Add Activity, Demo, Task, TaskReminder, EmailRecord, Notification models and enums to Prisma schema
  - Files: `prisma/schema.prisma` (MOD)
  - Workspace: prisma
  - Dependencies: none
  - Priority: P1
  - Refs: FR-007, FR-008, FR-009, FR-010

- **T044**: Create shared Zod schemas for Activity and Demo (create, update, response, list query)
  - Files: `packages/shared/src/schemas/activity.schema.ts` (NEW), `packages/shared/src/schemas/activity.schema.test.ts` (NEW)
  - Workspace: shared
  - Dependencies: T043
  - Priority: P1
  - Refs: FR-007

- **T045**: Create shared Zod schemas for Task (create, update, response, list query)
  - Files: `packages/shared/src/schemas/task.schema.ts` (NEW), `packages/shared/src/schemas/task.schema.test.ts` (NEW)
  - Workspace: shared
  - Dependencies: T043
  - Priority: P1
  - Refs: FR-009
  - [P] Parallel with T044

- **T046**: Create shared Zod schemas for EmailRecord and Notification
  - Files: `packages/shared/src/schemas/email-record.schema.ts` (NEW), `packages/shared/src/schemas/email-record.schema.test.ts` (NEW), `packages/shared/src/schemas/notification.schema.ts` (NEW), `packages/shared/src/schemas/notification.schema.test.ts` (NEW)
  - Workspace: shared
  - Dependencies: T043
  - Priority: P2
  - Refs: FR-010
  - [P] Parallel with T044, T045

- **T047**: Update shared index.ts and constants with new exports and ERROR_CODES
  - Files: `packages/shared/src/index.ts` (MOD), `packages/shared/src/constants/index.ts` (MOD)
  - Workspace: shared
  - Dependencies: T044, T045, T046
  - Priority: P1

- **T048**: Implement Activity CRUD service with edit-window enforcement and demo handling
  - Files: `backend/src/domains/activities/activity.service.ts` (NEW), `backend/src/domains/activities/activity.service.test.ts` (NEW), `backend/src/domains/activities/index.ts` (NEW)
  - Workspace: backend
  - Dependencies: T047
  - Priority: P1
  - Refs: FR-007, AC-007a, AC-007b

- **T049**: Implement Activity routes (POST, GET, PUT, DELETE, list by account)
  - Files: `backend/src/domains/activities/activity.routes.ts` (NEW), `backend/src/domains/activities/activity.routes.test.ts` (NEW)
  - Workspace: backend
  - Dependencies: T048
  - Priority: P1
  - Refs: FR-007

- **T050**: Register activity routes in app.ts
  - Files: `backend/src/app.ts` (MOD)
  - Workspace: backend
  - Dependencies: T049
  - Priority: P1

- **T051**: Implement activity metrics service and endpoint
  - Files: `backend/src/domains/activities/metrics.service.ts` (NEW), `backend/src/domains/activities/metrics.service.test.ts` (NEW)
  - Workspace: backend
  - Dependencies: T049
  - Priority: P3
  - Refs: FR-007 (US-6)

---

## Batch 8: Timeline, Tasks & Email Records

**Branch:** `feature/batch-8-tasks-timeline`
**Tasks:** T052–T060 (9 tasks)
**Focus:** Timeline aggregation, Task CRUD + routes, Email record service + routes

### US-2: Activity Timeline (P1)

- **T052**: Implement timeline aggregation service (multi-source merge, cursor pagination)
  - Files: `backend/src/domains/activities/timeline.service.ts` (NEW), `backend/src/domains/activities/timeline.service.test.ts` (NEW)
  - Workspace: backend
  - Dependencies: T048
  - Priority: P1
  - Refs: FR-008, AC-008a, AC-008b

- **T053**: Add timeline endpoint to activity routes (GET /api/accounts/:id/timeline)
  - Files: `backend/src/domains/activities/activity.routes.ts` (MOD)
  - Workspace: backend
  - Dependencies: T052
  - Priority: P1
  - Refs: FR-008

### US-3: Task Management (P1)

- **T054**: Implement Task CRUD service with overdue logic and status transitions
  - Files: `backend/src/domains/tasks/task.service.ts` (NEW), `backend/src/domains/tasks/task.service.test.ts` (NEW), `backend/src/domains/tasks/index.ts` (NEW)
  - Workspace: backend
  - Dependencies: T047
  - Priority: P1
  - Refs: FR-009, AC-009b
  - [P] Parallel with T052

- **T055**: Implement Task routes (POST, GET, PUT, DELETE, list)
  - Files: `backend/src/domains/tasks/task.routes.ts` (NEW), `backend/src/domains/tasks/task.routes.test.ts` (NEW)
  - Workspace: backend
  - Dependencies: T054
  - Priority: P1
  - Refs: FR-009

- **T056**: Register task routes in app.ts
  - Files: `backend/src/app.ts` (MOD)
  - Workspace: backend
  - Dependencies: T055
  - Priority: P1

### US-5: Email Record Tracking (P2)

- **T057**: Implement EmailRecord service with auto-linking and engagement tracking
  - Files: `backend/src/domains/activities/email-record.service.ts` (NEW), `backend/src/domains/activities/email-record.service.test.ts` (NEW)
  - Workspace: backend
  - Dependencies: T047
  - Priority: P2
  - Refs: FR-010, AC-010a, AC-010b
  - [P] Parallel with T052, T054

- **T058**: Implement EmailRecord routes (POST, unmatched list, engagement update)
  - Files: `backend/src/domains/activities/email-record.routes.ts` (NEW), `backend/src/domains/activities/email-record.routes.test.ts` (NEW)
  - Workspace: backend
  - Dependencies: T057
  - Priority: P2
  - Refs: FR-010

- **T059**: Register email-record routes in app.ts
  - Files: `backend/src/app.ts` (MOD)
  - Workspace: backend
  - Dependencies: T058
  - Priority: P2

- **T060**: Integrate email records and tasks into timeline service
  - Files: `backend/src/domains/activities/timeline.service.ts` (MOD), `backend/src/domains/activities/timeline.service.test.ts` (MOD)
  - Workspace: backend
  - Dependencies: T053, T057, T054
  - Priority: P1
  - Refs: FR-008

---

## Batch 9: Reminders, Notifications & Worker Jobs

**Branch:** `feature/batch-9-reminders-notifications`
**Tasks:** T061–T067 (7 tasks)
**Focus:** Task reminder scheduling, notification infrastructure, worker jobs

### US-4: Task Reminders (P2)

- **T061**: Create task-reminder queue config and types
  - Files: `worker/src/queues/task-reminder.queue.ts` (NEW)
  - Workspace: worker
  - Dependencies: T054
  - Priority: P2
  - Refs: FR-009, AC-009a

- **T062**: Create email-notification queue config and types
  - Files: `worker/src/queues/email-notification.queue.ts` (NEW)
  - Workspace: worker
  - Dependencies: none
  - Priority: P2
  - [P] Parallel with T061

- **T063**: Implement task reminder scheduling in task service (schedule/cancel jobs on create/update/delete)
  - Files: `backend/src/domains/tasks/task.service.ts` (MOD), `backend/src/domains/tasks/task.service.test.ts` (MOD)
  - Workspace: backend
  - Dependencies: T061
  - Priority: P2
  - Refs: FR-009, AC-009a

- **T064**: Implement task-reminder job processor (check task status, create notification, enqueue email)
  - Files: `worker/src/jobs/task-reminder.job.ts` (NEW), `worker/src/jobs/task-reminder.job.test.ts` (NEW)
  - Workspace: worker
  - Dependencies: T061, T062
  - Priority: P2
  - Refs: FR-009, AC-009a

- **T065**: Implement email-notification job processor (send via Nodemailer with retry)
  - Files: `worker/src/jobs/email-notification.job.ts` (NEW), `worker/src/jobs/email-notification.job.test.ts` (NEW)
  - Workspace: worker
  - Dependencies: T062
  - Priority: P2
  - [P] Parallel with T064

- **T066**: Register new workers and queues in worker/src/index.ts
  - Files: `worker/src/index.ts` (MOD)
  - Workspace: worker
  - Dependencies: T064, T065
  - Priority: P2

- **T067**: Integration test: full reminder lifecycle (create task → reminder fires → notification created → email enqueued → task completed → reminder skipped)
  - Files: `worker/src/jobs/task-reminder.job.test.ts` (MOD)
  - Workspace: worker
  - Dependencies: T063, T064, T065
  - Priority: P2
  - Refs: AC-009a

---

## Dependency Graph

```
T043 (schema) ──┬── T044 (activity schemas) ──┐
                ├── T045 (task schemas) ───────┤
                └── T046 (email schemas) ──────┘
                                               │
                                          T047 (exports)
                                               │
                     ┌─────────────────────────┼─────────────────┐
                     │                         │                 │
                T048 (activity svc) ──── T054 (task svc) ── T057 (email svc)
                     │                         │                 │
                T049 (activity routes)    T055 (task routes)  T058 (email routes)
                     │                         │                 │
                T050 (register)           T056 (register)    T059 (register)
                     │                         │                 │
                T051 (metrics)                 │                 │
                     │                         │                 │
                T052 (timeline svc) ──────────┼─────────────────┘
                     │                         │
                T053 (timeline route)          │
                     │                         │
                T060 (integrate timeline) ─────┘
                                               │
                                          T061 (reminder queue)
                                          T062 (email queue)
                                               │
                                          T063 (schedule reminders)
                                          T064 (reminder job)
                                          T065 (email job)
                                               │
                                          T066 (register workers)
                                          T067 (integration test)
```

## Summary

| Batch | Branch | Tasks | Est. Tests | Focus |
|-------|--------|-------|-----------|-------|
| 7 | feature/batch-7-activity-schema | T043-T051 (9) | ~50 | Schema, schemas, activity CRUD + routes |
| 8 | feature/batch-8-tasks-timeline | T052-T060 (9) | ~55 | Timeline, task CRUD + routes, email records |
| 9 | feature/batch-9-reminders-notifications | T061-T067 (7) | ~30 | Reminder scheduling, notification jobs |
| **Total** | | **25 tasks** | **~135** | |
