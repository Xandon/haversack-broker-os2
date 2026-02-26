# Conflict Analysis: Activity & Task Management

## Schema Conflicts

### 1. New Prisma models (SAFE)
- `Activity` — new model, no existing model with this name
- `Demo` — new model, no existing model with this name
- `Task` — new model, no existing model with this name
- `TaskReminder` — new model, no existing model with this name
- `EmailRecord` — new model, no existing model with this name
- `Notification` — new model, no existing model with this name

### 2. New enums (SAFE)
- `ActivityType` — enum(visit, call, email, demo, sampling)
- `TaskPriority` — enum(high, medium, low)
- `TaskStatus` — enum(pending, in_progress, completed, cancelled)
- `EmailDirection` — enum(inbound, outbound)
- `EmailStatus` — enum(sent, delivered, opened, clicked, bounced, failed)
- `NotificationType` — enum(task_reminder, task_assigned, task_overdue)

### 3. Existing model modifications (ADDITIVE)
- `Account` model: Add relations `activities Activity[]`, `tasks Task[]`, `emailRecords EmailRecord[]`
- `Contact` model: Add relation `emailRecords EmailRecord[]`
- `User` model: Add relations `activities Activity[]`, `createdTasks Task[]`, `assignedTasks Task[]`, `notifications Notification[]`

## Route Conflicts

### 4. New route registrations (ADDITIVE)
- `backend/src/app.ts` — add `import { activityRoutes }` + `app.register(activityRoutes)`
- `backend/src/app.ts` — add `import { taskRoutes }` + `app.register(taskRoutes)`
- `backend/src/app.ts` — add `import { emailRecordRoutes }` + `app.register(emailRecordRoutes)`
- `backend/src/app.ts` — add `import { timelineRoutes }` + `app.register(timelineRoutes)`

### 5. New API route paths (SAFE — no collisions)
- `POST /api/activities` — create activity
- `GET /api/activities/:id` — get activity
- `PUT /api/activities/:id` — update activity
- `DELETE /api/activities/:id` — soft-delete activity
- `GET /api/accounts/:id/timeline` — activity timeline (extends account routes)
- `GET /api/accounts/:id/activities` — list activities for account
- `POST /api/tasks` — create task
- `GET /api/tasks` — list tasks (my tasks, with filters)
- `GET /api/tasks/:id` — get task
- `PUT /api/tasks/:id` — update task
- `DELETE /api/tasks/:id` — soft-delete task
- `POST /api/email-records` — create email record (for ingestion pipeline)
- `GET /api/email-records/unmatched` — list unmatched emails
- `PUT /api/email-records/:id/engagement` — update engagement events
- `GET /api/activities/metrics` — activity metrics (manager)

No collisions with existing `/api/auth/*` or `/api/accounts/*` routes.

## Shared Schema Conflicts

### 6. New shared schemas (SAFE)
- `packages/shared/src/schemas/activity.schema.ts` — new file
- `packages/shared/src/schemas/task.schema.ts` — new file
- `packages/shared/src/schemas/email-record.schema.ts` — new file
- `packages/shared/src/schemas/notification.schema.ts` — new file

### 7. Shared index.ts (ADDITIVE)
- `packages/shared/src/index.ts` — add exports for new schemas

### 8. Shared constants (ADDITIVE)
- `packages/shared/src/constants/index.ts` — add new ERROR_CODES for activity/task/email domains

## Worker Conflicts

### 9. New queues (SAFE)
- `worker/src/queues/task-reminder.queue.ts` — new file
- `worker/src/queues/email-notification.queue.ts` — new file

### 10. New jobs (SAFE)
- `worker/src/jobs/task-reminder.job.ts` — new file
- `worker/src/jobs/email-notification.job.ts` — new file

### 11. Worker index.ts (ADDITIVE)
- `worker/src/index.ts` — register new queue processors

## Component Conflicts

No frontend components are modified. This feature is backend-only (API + worker). Frontend pages will be built in a later feature.

## Summary

| Category | SAFE | ADDITIVE | BREAKING |
|----------|------|----------|----------|
| Schema (models/enums) | 12 | 3 | 0 |
| Routes | 15 | 4 | 0 |
| Shared schemas | 4 | 2 | 0 |
| Worker | 4 | 1 | 0 |
| **Total** | **35** | **10** | **0** |

**Gate Decision: PASS** — All changes are SAFE (new files) or ADDITIVE (adding to existing files). No BREAKING changes.
