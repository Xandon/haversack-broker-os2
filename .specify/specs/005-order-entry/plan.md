# Implementation Plan: Order Entry & Approval

**Branch**: `005-order-entry` | **Date**: 2026-02-26 | **Spec**: `005-order-entry/spec.md`
**Input**: Feature specification from `/specs/005-order-entry/spec.md`

## Summary

Multi-vendor order creation with product search, manager approval workflow for orders >= $5,000, AI-powered reorder suggestions, and QuickBooks CSV export. Backend-only implementation following existing Fastify + Prisma patterns. Extends existing Prisma schema with Order, OrderLineItem, VendorSubOrder, OrderApproval, QuickBooksExport models plus stub Product/Brand models. Adds order domain routes, services, and background jobs for approval notifications and QB export.

## Technical Context

**Language/Version**: TypeScript 5.4+ (strict mode), Node.js 20 LTS
**Primary Dependencies**: Fastify 4+, Prisma 5+, BullMQ, Zod, TanStack Query v5
**Storage**: PostgreSQL 16+ with RLS, Redis 7+ for cache/queues
**Testing**: Vitest (unit/integration), Supertest (API endpoints)
**Target Platform**: Docker containers (backend, worker)
**Project Type**: Web service (monorepo)
**Performance Goals**: API p95 <200ms, product search <200ms, AI reorder <3s
**Constraints**: Orders >= $5,000 require manager approval, FSMA 204 traceability, audit trail on all order mutations
**Scale/Scope**: ~50 brands, ~9 reps, orders with 1-50+ line items

## Constitution Check

- [x] No new architectural patterns introduced — follows existing domain structure
- [x] No new dependencies introduced
- [x] Tenant isolation via tenantId on all models and queries
- [x] Audit trail on all order CRUD operations
- [x] RBAC enforcement on all routes (rep, manager, admin roles)
- [x] Zod validation on all API inputs

## Project Structure

### Source Code (repository root)

```text
prisma/
└── schema.prisma                                    # MOD — add Order, OrderLineItem, VendorSubOrder, OrderApproval, QuickBooksExport, Product, Brand models + enums

packages/shared/src/
├── schemas/
│   ├── order.schema.ts                              # NEW — Zod schemas for order CRUD, list, approval
│   ├── order.schema.test.ts                         # NEW — Schema validation tests
│   ├── product.schema.ts                            # NEW — Zod schemas for product search response
│   ├── product.schema.test.ts                       # NEW — Schema validation tests
│   └── notification.schema.ts                       # MOD — extend NotificationType enum
├── constants/
│   └── index.ts                                     # MOD — add ORDER_ERROR_CODES
└── index.ts                                         # MOD — add order + product schema exports

backend/src/
├── domains/
│   ├── orders/
│   │   ├── index.ts                                 # NEW — named exports
│   │   ├── order.service.ts                         # NEW — order CRUD, status transitions, vendor split
│   │   ├── order.service.test.ts                    # NEW — service unit tests
│   │   ├── order-approval.service.ts                # NEW — approval/rejection logic
│   │   ├── order-approval.service.test.ts           # NEW — approval unit tests
│   │   ├── order-search.service.ts                  # NEW — product search for order entry
│   │   ├── order-search.service.test.ts             # NEW — search unit tests
│   │   ├── order.routes.ts                          # NEW — Fastify route handlers
│   │   ├── order.routes.test.ts                     # NEW — route integration tests
│   │   └── reorder-suggestion.service.ts            # NEW — AI reorder suggestion logic
│   │   └── reorder-suggestion.service.test.ts       # NEW — reorder suggestion unit tests
│   └── products/
│       ├── index.ts                                 # NEW — named exports
│       ├── product.service.ts                       # NEW — product lookup + search
│       └── product.service.test.ts                  # NEW — product service tests
├── app.ts                                           # MOD — register orderRoutes

worker/src/
├── queues/
│   ├── order-approval.queue.ts                      # NEW — approval notification queue config
│   └── quickbooks-export.queue.ts                   # NEW — QB export queue config
├── jobs/
│   ├── order-approval-notification.job.ts           # NEW — sends approval notifications
│   ├── order-approval-notification.job.test.ts      # NEW — notification job tests
│   ├── quickbooks-export.job.ts                     # NEW — CSV export generation
│   └── quickbooks-export.job.test.ts                # NEW — export job tests
└── index.ts                                         # MOD — register new queues + workers
```

**File Summary: 26 NEW files, 6 MODIFIED files = 32 total**

### Modifications to Existing Files

#### prisma/schema.prisma — ADDITIVE

**New enums:**
- `OrderStatus`: draft, pending_approval, confirmed, rejected, cancelled
- `RevenueModel`: broker, wholesale
- `AvailabilityStatus`: active, seasonal, discontinued
- `ApprovalDecision`: approved, rejected
- `ExportStatus`: queued, exported, failed

**New models:**
- `Brand` (stub): id, tenantId, name, commissionRate, isActive, timestamps
- `Product` (stub): id, tenantId, brandId, name, sku, unitPrice, wholesalePrice, promotionalPrice, promotionalPriceStart, promotionalPriceEnd, caseSize, revenueModelDefault, availabilityStatus, isActive, timestamps
- `Order`: id, tenantId, orderNumber, accountId, repId, status, subtotal, tax, total, notes, submittedAt, confirmedAt, cancelledAt, exportStatus, timestamps, version
- `OrderLineItem`: id, tenantId, orderId, productId, vendorSubOrderId, quantity, unitPrice, revenueModel, commissionRate, discount, lineTotal, promotionalPriceApplied, timestamps
- `VendorSubOrder`: id, tenantId, orderId, brandId, subtotal, fulfillmentStatus, timestamps
- `OrderApproval`: id, tenantId, orderId, approverId, decision, reason, decidedAt, timestamps
- `QuickBooksExport`: id, tenantId, orderId, status, attemptCount, lastAttemptAt, errorDetails, csvData, timestamps

**Existing model modifications:**
- `Account`: add `orders Order[]` relation
- `User`: add `createdOrders Order[]`, `approvals OrderApproval[]` relations
- `NotificationType` enum: add `order_approval_required`, `order_approved`, `order_rejected`, `order_export_failed`

#### backend/src/app.ts — ADDITIVE
- Add import: `import { orderRoutes } from './domains/orders/order.routes'`
- Add registration: `await app.register(orderRoutes)`

#### packages/shared/src/schemas/notification.schema.ts — ADDITIVE
- Extend `notificationTypeSchema` enum with order notification types

#### packages/shared/src/constants/index.ts — ADDITIVE
- Add `ORDER_ERROR_CODES` constants

#### packages/shared/src/index.ts — ADDITIVE
- Add exports for order and product schemas

#### worker/src/index.ts — ADDITIVE
- Import and register order approval notification queue + worker
- Import and register QuickBooks export queue + worker

## API Contracts

### Order Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/orders | rep, manager | Create draft order |
| GET | /api/orders | rep, manager | List orders (cursor pagination) |
| GET | /api/orders/:id | rep, manager | Get order detail with line items |
| PUT | /api/orders/:id | rep, manager | Update draft order |
| POST | /api/orders/:id/submit | rep, manager | Submit order (triggers approval if >= $5k) |
| POST | /api/orders/:id/approve | manager | Approve pending order |
| POST | /api/orders/:id/reject | manager | Reject pending order with reason |
| POST | /api/orders/:id/cancel | rep, manager | Cancel order |
| GET | /api/orders/approval-queue | manager | List orders pending approval |
| GET | /api/accounts/:id/reorder-suggestion | rep, manager | AI reorder suggestion |

### Product Endpoints (stub for order entry)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/products/search | rep, manager | Search products by name/SKU/brand/category |

## Batch Plan

### Batch 10: Schema, Shared Types & Product Stubs
- Prisma schema additions (all models + enums)
- Shared Zod schemas (order, product)
- Shared constants (error codes)
- Product stub service (basic CRUD + search)
- **Estimated: 8 tasks, ~40 tests**

### Batch 11: Order Core CRUD & Approval
- Order service (create, get, update, list, submit, cancel)
- Order approval service (approve, reject)
- Vendor sub-order splitting logic
- Order routes (all endpoints)
- Approval notification queue + job
- **Estimated: 10 tasks, ~60 tests**

### Batch 12: AI Reorder, QuickBooks Export & Integration
- AI reorder suggestion service
- QuickBooks export queue + job
- Reorder suggestion route
- Product search route
- Integration tests for full order workflow
- **Estimated: 7 tasks, ~35 tests**
