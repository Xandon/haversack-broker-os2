# Conflict Analysis — 005-order-entry

## Summary

| Classification | Count | Details |
|---------------|-------|---------|
| SAFE (new files only) | 22 | New domain files, schemas, routes, services, jobs |
| ADDITIVE (existing files modified by adding) | 6 | Schema, app.ts, shared index, notification type |
| BREAKING | 0 | None |

**GATE: ALL SAFE or ADDITIVE — proceed.**

## Detailed Analysis

### 1. Schema Conflicts (prisma/schema.prisma) — ADDITIVE

**New enums to add:**
- `OrderStatus`: draft, pending_approval, confirmed, rejected, cancelled
- `RevenueModel`: broker, wholesale
- `AvailabilityStatus`: active, seasonal, discontinued (for Product model — may come with Feature 5)
- `ApprovalDecision`: approved, rejected
- `ExportStatus`: queued, exported, failed

**New models to add:**
- `Order` — references Account, User (rep), with line items and sub-orders
- `OrderLineItem` — references Order, product ID
- `VendorSubOrder` — references Order, groups line items by vendor
- `OrderApproval` — references Order, User (approver)
- `QuickBooksExport` — references Order

**Existing model modifications (ADDITIVE only):**
- `Account` model: add `orders Order[]` relation
- `User` model: add `createdOrders Order[] @relation("OrderCreator")`, `approvals OrderApproval[]` relations
- `NotificationType` enum: add `order_approval_required`, `order_approved`, `order_rejected`, `order_export_failed`

**Risk assessment:** No existing field changes. All additions to existing models are new relation fields that don't affect existing queries or data. NotificationType enum extension is forward-compatible.

### 2. Route Conflicts (backend/src/app.ts) — ADDITIVE

**New route registrations to add:**
- `import { orderRoutes } from './domains/orders/order.routes'`
- `await app.register(orderRoutes)` in the Routes section

**Existing routes unaffected:**
- `/api/auth/*` — no collision
- `/api/accounts/*` — no collision
- `/api/activities/*` — no collision
- `/api/email-records/*` — no collision
- `/api/tasks/*` — no collision
- `/api/health` — no collision

**New route paths (all unique):**
- `POST /api/orders` — create order
- `GET /api/orders` — list orders
- `GET /api/orders/:id` — get order detail
- `PUT /api/orders/:id` — update draft order
- `POST /api/orders/:id/submit` — submit order
- `POST /api/orders/:id/approve` — approve order (manager)
- `POST /api/orders/:id/reject` — reject order (manager)
- `POST /api/orders/:id/cancel` — cancel order
- `GET /api/orders/approval-queue` — manager approval queue
- `GET /api/accounts/:id/reorder-suggestion` — AI reorder suggestion

### 3. Shared Schema Conflicts (packages/shared/) — ADDITIVE

**New files (no conflicts):**
- `packages/shared/src/schemas/order.schema.ts` — NEW
- `packages/shared/src/schemas/order.schema.test.ts` — NEW

**Existing file modifications:**
- `packages/shared/src/index.ts` — ADDITIVE: add new exports for order schemas
- `packages/shared/src/schemas/notification.schema.ts` — ADDITIVE: extend `notificationTypeSchema` enum values

**Notification schema change detail:**
```
Current: z.enum(['task_reminder', 'task_assigned', 'task_overdue'])
After:   z.enum(['task_reminder', 'task_assigned', 'task_overdue',
                  'order_approval_required', 'order_approved', 'order_rejected', 'order_export_failed'])
```
This is additive — existing notification types remain valid. All existing code that creates task-related notifications will continue to work.

### 4. Component Conflicts — SAFE

No frontend UI components exist yet. All order-related frontend components will be new files.

### 5. Hook Conflicts — SAFE

No frontend TanStack Query hooks exist yet for orders. All will be new files.

### 6. Worker/Queue Conflicts — ADDITIVE

**Existing worker setup (worker/src/index.ts):**
- Has `registerWorkers()` function for task reminders and email notifications
- Need to add: order approval notification job, QuickBooks export job

**Modification:** Add new queue registrations and worker imports — ADDITIVE.

## Dependency Notes

- This feature depends on Product/Brand entities not yet in the schema. Options:
  1. **Stub approach**: Add minimal Product/Brand models in this feature's first batch (schema-only, enough for order line items to reference)
  2. **Wait for Feature 5**: Build Feature 5 (Product Catalog & Line Cards) first

  **Decision**: Use stub approach — add minimal Product and Brand models with fields needed by orders. Feature 5 will extend these models with full catalog capabilities. This is ADDITIVE and avoids blocking.
