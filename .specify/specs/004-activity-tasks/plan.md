# Implementation Plan: Activity & Task Management

**Branch**: `004-activity-tasks` | **Date**: 2026-02-26 | **Spec**: `specs/004-activity-tasks/spec.md`

## Summary

Implement activity logging (visit, call, email, demo, sampling), activity timeline with cursor-based pagination, task management with reminders, email record tracking with auto-linking, and activity metrics. Backend-only feature (API + worker jobs). Follows established patterns from the accounts domain.

## Technical Context

**Language/Version**: TypeScript 5.4+ (strict mode), Node.js 20 LTS
**Primary Dependencies**: Fastify 4+, Prisma 5+, BullMQ, Zod, Vitest
**Storage**: PostgreSQL 16+ with RLS indexes, Redis 7+ for job queues
**Testing**: Vitest (unit/integration), Supertest (API)
**Target Platform**: Docker containers (backend, worker)
**Performance Goals**: Activity create <2s p95, Timeline <500ms p95, Task list <200ms p95
**Constraints**: Tenant isolation on all queries, audit trail on all CUD ops
**Scale/Scope**: ~9 reps, ~50 brands, ~1000 accounts, ~10K activities/year

## Constitution Check

All constitution gates pass:
- Single-responsibility containers: backend serves API, worker processes jobs
- Domain-organized code: `backend/src/domains/activities/`, `backend/src/domains/tasks/`
- No circular dependencies: activities -> audit service (one-way)
- Named exports only, explicit return types, no `any` type
- Tenant isolation via RLS indexes + service-layer filtering

## Project Structure

### Documentation (this feature)

```text
.specify/specs/004-activity-tasks/
├── spec.md
├── plan.md              # This file
├── research.md
├── data-model.md
├── quickstart.md
├── conflicts.md
├── checklists/
│   └── requirements.md
├── contracts/
│   ├── activity-api.md
│   ├── task-api.md
│   ├── email-record-api.md
│   └── timeline-api.md
└── tasks.md
```

### Source Code (repository root)

```text
# Backend domain: activities
backend/src/domains/activities/
├── activity.service.ts           # NEW — CRUD, edit-window logic
├── activity.service.test.ts      # NEW — unit tests
├── activity.routes.ts            # NEW — Fastify routes for activities
├── activity.routes.test.ts       # NEW — route integration tests
├── timeline.service.ts           # NEW — aggregated timeline queries
├── timeline.service.test.ts      # NEW — unit tests
├── email-record.service.ts       # NEW — CRUD, auto-linking logic
├── email-record.service.test.ts  # NEW — unit tests
├── email-record.routes.ts        # NEW — Fastify routes for email records
├── email-record.routes.test.ts   # NEW — route integration tests
├── metrics.service.ts            # NEW — activity aggregation queries
├── metrics.service.test.ts       # NEW — unit tests
└── index.ts                      # NEW — barrel exports

# Backend domain: tasks
backend/src/domains/tasks/
├── task.service.ts               # NEW — CRUD, overdue logic, reminder scheduling
├── task.service.test.ts          # NEW — unit tests
├── task.routes.ts                # NEW — Fastify routes for tasks
├── task.routes.test.ts           # NEW — route integration tests
└── index.ts                      # NEW — barrel exports

# Shared schemas
packages/shared/src/schemas/
├── activity.schema.ts            # NEW — Zod schemas for activity CRUD + timeline
├── activity.schema.test.ts       # NEW — schema validation tests
├── task.schema.ts                # NEW — Zod schemas for task CRUD
├── task.schema.test.ts           # NEW — schema validation tests
├── email-record.schema.ts        # NEW — Zod schemas for email records
├── email-record.schema.test.ts   # NEW — schema validation tests
├── notification.schema.ts        # NEW — Zod schemas for notifications
└── notification.schema.test.ts   # NEW — schema validation tests

# Worker jobs and queues
worker/src/
├── queues/
│   ├── task-reminder.queue.ts         # NEW — queue config + types
│   └── email-notification.queue.ts    # NEW — queue config + types
├── jobs/
│   ├── task-reminder.job.ts           # NEW — reminder processor
│   ├── task-reminder.job.test.ts      # NEW — unit tests
│   ├── email-notification.job.ts      # NEW — email sending processor
│   └── email-notification.job.test.ts # NEW — unit tests

# Modified files
prisma/schema.prisma                   # MODIFIED — add 6 new models, 6 new enums, 3 relation updates
backend/src/app.ts                     # MODIFIED — register activity, task, email-record routes
packages/shared/src/index.ts           # MODIFIED — export new schemas
packages/shared/src/constants/index.ts # MODIFIED — add new ERROR_CODES
worker/src/index.ts                    # MODIFIED — register new queues + workers
```

## File Inventory

| # | File | Action | Workspace | Notes |
|---|------|--------|-----------|-------|
| 1 | `prisma/schema.prisma` | MODIFIED | prisma | Add Activity, Demo, Task, TaskReminder, EmailRecord, Notification models + enums + Account/Contact/User relations |
| 2 | `packages/shared/src/schemas/activity.schema.ts` | NEW | shared | Zod: createActivity, updateActivity, activityResponse, timelineQuery, timelineItem |
| 3 | `packages/shared/src/schemas/activity.schema.test.ts` | NEW | shared | Validation tests |
| 4 | `packages/shared/src/schemas/task.schema.ts` | NEW | shared | Zod: createTask, updateTask, taskResponse, taskListQuery |
| 5 | `packages/shared/src/schemas/task.schema.test.ts` | NEW | shared | Validation tests |
| 6 | `packages/shared/src/schemas/email-record.schema.ts` | NEW | shared | Zod: createEmailRecord, emailRecordResponse, engagementUpdate |
| 7 | `packages/shared/src/schemas/email-record.schema.test.ts` | NEW | shared | Validation tests |
| 8 | `packages/shared/src/schemas/notification.schema.ts` | NEW | shared | Zod: notificationResponse |
| 9 | `packages/shared/src/schemas/notification.schema.test.ts` | NEW | shared | Validation tests |
| 10 | `packages/shared/src/index.ts` | MODIFIED | shared | Export new schemas |
| 11 | `packages/shared/src/constants/index.ts` | MODIFIED | shared | Add ERROR_CODES for activity/task/email domains |
| 12 | `backend/src/domains/activities/activity.service.ts` | NEW | backend | CRUD + edit-window enforcement + demo handling |
| 13 | `backend/src/domains/activities/activity.service.test.ts` | NEW | backend | Unit tests |
| 14 | `backend/src/domains/activities/timeline.service.ts` | NEW | backend | Multi-source timeline aggregation + pagination |
| 15 | `backend/src/domains/activities/timeline.service.test.ts` | NEW | backend | Unit tests |
| 16 | `backend/src/domains/activities/email-record.service.ts` | NEW | backend | CRUD + auto-linking + engagement tracking |
| 17 | `backend/src/domains/activities/email-record.service.test.ts` | NEW | backend | Unit tests |
| 18 | `backend/src/domains/activities/metrics.service.ts` | NEW | backend | Activity aggregation queries |
| 19 | `backend/src/domains/activities/metrics.service.test.ts` | NEW | backend | Unit tests |
| 20 | `backend/src/domains/activities/activity.routes.ts` | NEW | backend | Fastify routes: activities + timeline + metrics |
| 21 | `backend/src/domains/activities/activity.routes.test.ts` | NEW | backend | Route integration tests |
| 22 | `backend/src/domains/activities/email-record.routes.ts` | NEW | backend | Fastify routes: email records |
| 23 | `backend/src/domains/activities/email-record.routes.test.ts` | NEW | backend | Route integration tests |
| 24 | `backend/src/domains/activities/index.ts` | NEW | backend | Barrel exports |
| 25 | `backend/src/domains/tasks/task.service.ts` | NEW | backend | CRUD + overdue logic + reminder scheduling |
| 26 | `backend/src/domains/tasks/task.service.test.ts` | NEW | backend | Unit tests |
| 27 | `backend/src/domains/tasks/task.routes.ts` | NEW | backend | Fastify routes: tasks |
| 28 | `backend/src/domains/tasks/task.routes.test.ts` | NEW | backend | Route integration tests |
| 29 | `backend/src/domains/tasks/index.ts` | NEW | backend | Barrel exports |
| 30 | `backend/src/app.ts` | MODIFIED | backend | Register activity, task, email-record routes |
| 31 | `worker/src/queues/task-reminder.queue.ts` | NEW | worker | Queue name + job data type |
| 32 | `worker/src/queues/email-notification.queue.ts` | NEW | worker | Queue name + job data type |
| 33 | `worker/src/jobs/task-reminder.job.ts` | NEW | worker | Process reminder: check task status, create notification, enqueue email |
| 34 | `worker/src/jobs/task-reminder.job.test.ts` | NEW | worker | Unit tests |
| 35 | `worker/src/jobs/email-notification.job.ts` | NEW | worker | Send email via Nodemailer with retry |
| 36 | `worker/src/jobs/email-notification.job.test.ts` | NEW | worker | Unit tests |
| 37 | `worker/src/index.ts` | MODIFIED | worker | Register task-reminder + email-notification workers |

**Total: 37 files (31 new, 6 modified)**
