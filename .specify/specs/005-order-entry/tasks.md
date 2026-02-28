# Tasks — 005-order-entry (Order Entry & Approval)

**Feature:** Order Entry & Approval
**PRD:** FR-011, FR-012, FR-013, FR-014, FR-015
**Task range:** T068-T092
**Batches:** 10, 11, 12 (global counter)

## Batch 10: Schema, Shared Types & Product Stubs

**Branch:** `feature/batch-10-order-schema`
**Depends on:** Features 1-3 complete (T001-T067)

### T068: Add order-related enums to Prisma schema (P1)
- **US:** Foundation for all order entities
- **Refs:** FR-011, FR-013, FR-015
- **Files:**
  - `prisma/schema.prisma` (MOD) — add OrderStatus, RevenueModel, AvailabilityStatus, ApprovalDecision, ExportStatus enums
- **Depends on:** none
- **Tests:** Schema validation tests (enum values match Zod schemas)

### T069: Add Brand and Product stub models to Prisma schema (P1)
- **US:** US-2 (product search), US-1 (line items reference products)
- **Refs:** FR-012, FR-011
- **Files:**
  - `prisma/schema.prisma` (MOD) — add Brand, Product models with indexes
- **Depends on:** T068
- **Tests:** Schema migration tests

### T070: Add Order, OrderLineItem, VendorSubOrder models to Prisma schema (P1)
- **US:** US-1 (order creation with line items)
- **Refs:** FR-011
- **Files:**
  - `prisma/schema.prisma` (MOD) — add Order, OrderLineItem, VendorSubOrder models with indexes and relations to Account, User, Product, Brand
- **Depends on:** T069
- **Tests:** Schema migration tests, relation validation

### T071: Add OrderApproval, QuickBooksExport models and extend NotificationType (P1)
- **US:** US-3 (approval), US-5 (QB export)
- **Refs:** FR-013, FR-015
- **Files:**
  - `prisma/schema.prisma` (MOD) — add OrderApproval, QuickBooksExport models; extend NotificationType enum with order types; add relations to Account and User
- **Depends on:** T070
- **Tests:** Schema migration tests

### T072: Create shared Zod schemas for orders (P1)
- **US:** US-1, US-2, US-3
- **Refs:** FR-011, FR-012, FR-013
- **Files:**
  - `packages/shared/src/schemas/order.schema.ts` (NEW) — createOrderSchema, updateOrderSchema, orderResponseSchema, orderListQuerySchema, orderLineItemSchema, submitOrderSchema, approvalDecisionSchema, rejectionSchema
  - `packages/shared/src/schemas/order.schema.test.ts` (NEW) — validation tests
- **Depends on:** T068
- **Tests:** ~12 tests (schema validation for each schema)

### T073: Create shared Zod schemas for products (P1)
- **US:** US-2 (product search)
- **Refs:** FR-012
- **Files:**
  - `packages/shared/src/schemas/product.schema.ts` (NEW) — productSearchQuerySchema, productResponseSchema
  - `packages/shared/src/schemas/product.schema.test.ts` (NEW) — validation tests
- **Depends on:** T068
- **Tests:** ~6 tests

### T074: Add order error codes and update shared exports (P1)
- **US:** All
- **Refs:** FR-011, FR-012, FR-013, FR-014, FR-015
- **Files:**
  - `packages/shared/src/constants/index.ts` (MOD) — add ORDER_ERROR_CODES
  - `packages/shared/src/schemas/notification.schema.ts` (MOD) — extend NotificationType with order types
  - `packages/shared/src/index.ts` (MOD) — export order + product schemas
- **Depends on:** T072, T073
- **Tests:** ~4 tests (constant existence, notification type validation)

### T075: Product stub service and search [P] (P1)
- **US:** US-2 (product search)
- **Refs:** FR-012
- **Files:**
  - `backend/src/domains/products/index.ts` (NEW) — named exports
  - `backend/src/domains/products/product.service.ts` (NEW) — getProductById, searchProducts (pg_trgm ILIKE)
  - `backend/src/domains/products/product.service.test.ts` (NEW) — unit tests
- **Depends on:** T069, T073
- **Tests:** ~10 tests (search matching, availability filtering, promo price logic, tenant isolation)

---

## Batch 11: Order Core CRUD & Approval

**Branch:** `feature/batch-11-order-crud`
**Depends on:** Batch 10 complete

### T076: Order service — create draft order (P1)
- **US:** US-1 (multi-line order creation)
- **Refs:** FR-011
- **Files:**
  - `backend/src/domains/orders/index.ts` (NEW) — named exports
  - `backend/src/domains/orders/order.service.ts` (NEW) — createOrder (generates orderNumber, calculates totals, creates line items in transaction, writes audit log)
- **Depends on:** T074, T075
- **Tests:** ~8 tests (draft creation, total calculation, promo price application, tenant isolation, audit log, orderNumber generation)

### T077: Order service — get, list, update draft (P1)
- **US:** US-1
- **Refs:** FR-011
- **Files:**
  - `backend/src/domains/orders/order.service.ts` (MOD) — getOrderById, listOrders (cursor pagination), updateDraftOrder (optimistic concurrency, line item replacement)
  - `backend/src/domains/orders/order.service.test.ts` (NEW) — unit tests
- **Depends on:** T076
- **Tests:** ~12 tests (get with relations, list with filters, update with concurrency, edit-only-draft validation, pagination)

### T078: Order service — submit order with vendor splitting (P1)
- **US:** US-1 (vendor split), US-3 (approval threshold)
- **Refs:** FR-011, FR-013
- **Files:**
  - `backend/src/domains/orders/order.service.ts` (MOD) — submitOrder (validates has line items, creates VendorSubOrders grouped by brand, transitions to pending_approval if >= $5k else confirmed, audit log)
- **Depends on:** T077
- **Tests:** ~10 tests (vendor split correctness, $5k threshold, status transition, empty order rejection, audit trail)

### T079: Order service — cancel order (P1)
- **US:** US-1
- **Refs:** FR-011
- **Files:**
  - `backend/src/domains/orders/order.service.ts` (MOD) — cancelOrder (validates status, prevents cancelling confirmed/exported, sets cancelledAt, audit log)
- **Depends on:** T078
- **Tests:** ~4 tests (cancel draft, cancel pending, reject cancel confirmed, audit)

### T080: Order approval service — approve and reject (P1)
- **US:** US-3 (manager approval)
- **Refs:** FR-013
- **Files:**
  - `backend/src/domains/orders/order-approval.service.ts` (NEW) — approveOrder (validates pending_approval, creates OrderApproval record, transitions to confirmed, writes audit), rejectOrder (requires reason, transitions to rejected, writes audit)
  - `backend/src/domains/orders/order-approval.service.test.ts` (NEW) — unit tests
- **Depends on:** T078
- **Tests:** ~8 tests (approve flow, reject flow, reject requires reason, wrong status error, audit trail, concurrent approval)

### T081: Approval notification queue and job (P1)
- **US:** US-3 (notification within 30 seconds)
- **Refs:** FR-013
- **Files:**
  - `worker/src/queues/order-approval.queue.ts` (NEW) — queue config, job data interface
  - `worker/src/jobs/order-approval-notification.job.ts` (NEW) — creates in-app Notification record, queues email notification
  - `worker/src/jobs/order-approval-notification.job.test.ts` (NEW) — unit tests
- **Depends on:** T074
- **Tests:** ~6 tests (approval required notification, approved notification, rejected notification, email job queued)

### T082: Order routes — CRUD endpoints (P1)
- **US:** US-1, US-3
- **Refs:** FR-011, FR-013
- **Files:**
  - `backend/src/domains/orders/order.routes.ts` (NEW) — POST /api/orders, GET /api/orders, GET /api/orders/:id, PUT /api/orders/:id, POST /api/orders/:id/submit, POST /api/orders/:id/cancel
  - `backend/src/app.ts` (MOD) — register orderRoutes
- **Depends on:** T076, T077, T078, T079
- **Tests:** ~10 tests (route registration, auth middleware, Zod validation, response shapes)

### T083: Order routes — approval endpoints (P1)
- **US:** US-3
- **Refs:** FR-013
- **Files:**
  - `backend/src/domains/orders/order.routes.ts` (MOD) — POST /api/orders/:id/approve, POST /api/orders/:id/reject, GET /api/orders/approval-queue
- **Depends on:** T080, T082
- **Tests:** ~6 tests (manager-only auth, approval flow, rejection flow, approval queue listing)

### T084: Order routes integration tests (P1)
- **US:** US-1, US-3
- **Refs:** FR-011, FR-013
- **Files:**
  - `backend/src/domains/orders/order.routes.test.ts` (NEW) — full integration tests for all order routes
- **Depends on:** T082, T083
- **Tests:** ~10 tests (end-to-end order lifecycle, approval workflow, error cases)

### T085: Register approval worker in worker entry point (P1)
- **US:** US-3
- **Refs:** FR-013
- **Files:**
  - `worker/src/index.ts` (MOD) — import and register order-approval notification queue + worker
- **Depends on:** T081
- **Tests:** ~2 tests (worker registration, graceful shutdown)

---

## Batch 12: AI Reorder, QuickBooks Export & Integration

**Branch:** `feature/batch-12-order-ai-export`
**Depends on:** Batch 11 complete

### T086: AI reorder suggestion service (P2)
- **US:** US-4 (AI reorder)
- **Refs:** FR-014
- **Files:**
  - `backend/src/domains/orders/reorder-suggestion.service.ts` (NEW) — getReorderSuggestion (checks 6-order minimum, analyzes order history, calls AI provider, caches in Redis, handles AI timeout/errors)
  - `backend/src/domains/orders/reorder-suggestion.service.test.ts` (NEW) — unit tests
- **Depends on:** T077
- **Tests:** ~8 tests (6-order minimum, suggestion generation, cache hit, AI timeout graceful error, discontinued product exclusion, median quantity calculation)

### T087: Product search route (P1)
- **US:** US-2 (real-time product search)
- **Refs:** FR-012
- **Files:**
  - `backend/src/domains/products/product.routes.ts` (NEW) — GET /api/products/search
  - `backend/src/domains/products/product.routes.test.ts` (NEW) — integration tests
  - `backend/src/app.ts` (MOD) — register productRoutes
- **Depends on:** T075
- **Tests:** ~6 tests (search by name/SKU/brand, promo price display, availability status, auth)

### T088: Reorder suggestion route (P2)
- **US:** US-4
- **Refs:** FR-014
- **Files:**
  - `backend/src/domains/orders/order.routes.ts` (MOD) — GET /api/accounts/:id/reorder-suggestion
- **Depends on:** T086, T082
- **Tests:** ~4 tests (success response, insufficient history error, AI unavailable error, auth)

### T089: QuickBooks export queue and job (P2)
- **US:** US-5 (QuickBooks export)
- **Refs:** FR-015
- **Files:**
  - `worker/src/queues/quickbooks-export.queue.ts` (NEW) — hourly cron queue config
  - `worker/src/jobs/quickbooks-export.job.ts` (NEW) — scans confirmed orders, generates CSV, updates export status, handles retries
  - `worker/src/jobs/quickbooks-export.job.test.ts` (NEW) — unit tests
- **Depends on:** T074
- **Tests:** ~8 tests (CSV generation, export status transitions, retry with exponential backoff, failure notification after 3 retries, no double-export)

### T090: Register QuickBooks export worker (P2)
- **US:** US-5
- **Refs:** FR-015
- **Files:**
  - `worker/src/index.ts` (MOD) — import and register quickbooks-export queue + worker
- **Depends on:** T089
- **Tests:** ~2 tests (worker registration)

### T091: Order product search service — pg_trgm optimization (P1)
- **US:** US-2 (200ms search requirement)
- **Refs:** FR-012
- **Files:**
  - `backend/src/domains/orders/order-search.service.ts` (NEW) — searchProductsForOrder (wraps product search with order-context enrichment: promo price eligibility check, availability warnings)
  - `backend/src/domains/orders/order-search.service.test.ts` (NEW) — unit tests
- **Depends on:** T075
- **Tests:** ~4 tests (promo date validation, out-of-stock warning, search latency)

### T092: Full order lifecycle integration test (P1)
- **US:** US-1, US-2, US-3, US-4, US-5
- **Refs:** FR-011, FR-012, FR-013, FR-014, FR-015
- **Files:**
  - `backend/src/domains/orders/order-lifecycle.integration.test.ts` (NEW) — end-to-end lifecycle: create → add items → submit → approve → export
- **Depends on:** T084, T087, T088, T089
- **Tests:** ~6 tests (full lifecycle, approval workflow, rejection workflow, cancel workflow, reorder-to-order conversion, export verification)

---

## Task Summary

| Batch | Tasks | Task IDs | Estimated Tests |
|-------|-------|----------|----------------|
| 10 | 8 | T068-T075 | ~32 |
| 11 | 10 | T076-T085 | ~66 |
| 12 | 7 | T086-T092 | ~38 |
| **Total** | **25** | **T068-T092** | **~136** |

## Dependency Graph

```
T068 (enums) ──┬── T069 (Brand/Product models) ── T070 (Order models) ── T071 (Approval/Export models)
               │                                        │
               ├── T072 (order schemas) ──┐             │
               └── T073 (product schemas)─┤             │
                                          ├── T074 (constants/exports) ──┬── T081 (approval job)
                                          │                              └── T089 (QB export job)
               T069 + T073 ── T075 (product service) ──┬── T087 (product route)
                                                        └── T091 (order search service)
               T074 + T075 ── T076 (create order) ── T077 (get/list/update) ── T078 (submit) ──┬── T079 (cancel)
                                                                                                ├── T080 (approval service)
                                                                                                └── T086 (AI reorder)
               T076-T079 ── T082 (CRUD routes) ──┬── T083 (approval routes) ── T084 (integration tests)
                                                  └── T088 (reorder route)
               T081 ── T085 (register approval worker)
               T089 ── T090 (register QB worker)
               T084 + T087 + T088 + T089 ── T092 (full lifecycle test)
```

## Parallel Opportunities

- [P] T072 + T073 can run in parallel (independent Zod schemas)
- [P] T075 can run in parallel with T076-T079 once T069+T073 are done
- [P] T081 + T089 can be developed in parallel (independent worker jobs)
- [P] T086 + T089 can be developed in parallel (AI reorder vs QB export)
