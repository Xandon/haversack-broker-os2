# Research: Admin & Data Import

**Feature:** 009-admin-import
**Reference Domain:** accounts (CRUD pattern), health-score (worker/cron pattern)
**Researched:** 2026-02-27

## Decision 1: Route Organization

**Decision:** Create two route files under a single `domains/admin/` directory.
**Rationale:** The accounts domain demonstrates the pattern — one route file per domain with service file alongside. Admin is a logical domain grouping user management, data import, and data quality.
**Alternatives:** Separate `domains/users/` and `domains/import/` directories — rejected because both are admin-only functionality and share the same RBAC pattern.

**Files:**
- `backend/src/domains/admin/user.routes.ts` — user management CRUD
- `backend/src/domains/admin/import.routes.ts` — data import endpoints
- `backend/src/domains/admin/quality.routes.ts` — data quality scorecard

## Decision 2: RBAC Pattern

**Decision:** Use `authorize('admin')` for user management and import; `authorize('admin', 'manager')` for data quality scorecard reads.
**Rationale:** Follows established pattern from account.routes.ts where `authorize('rep', 'manager')` restricts writes. The `authorize` middleware accepts role varargs.
**Alternatives:** Custom middleware — rejected, existing authorize middleware handles this.

## Decision 3: Service Layer Pattern

**Decision:** Follow account.service.ts pattern: exported functions taking PrismaClient + tenantId + data + auditContext.
**Rationale:** All 7 existing domains use this pattern. Consistent service signatures enable predictable testing.
**Alternatives:** Class-based services — rejected per project convention (functional style).

**Pattern:**
```typescript
export async function createUser(
  prisma: PrismaClient,
  tenantId: string,
  data: CreateUserInput,
  audit: AuditContext,
): Promise<User> { ... }
```

## Decision 4: Error Handling Pattern

**Decision:** Create `AdminError` class extending Error with `code` property, matching `AccountError` pattern.
**Rationale:** Each domain has its own error class with domain-specific error codes. Consistent with the `handleAccountError` pattern in routes.

**Error codes:**
- `USER_NOT_FOUND`, `USER_EMAIL_DUPLICATE`, `USER_SELF_DEACTIVATION`, `USER_CONFLICT`
- `IMPORT_NOT_FOUND`, `IMPORT_FILE_TOO_LARGE`, `IMPORT_INVALID_FORMAT`, `IMPORT_ALREADY_PROCESSING`

## Decision 5: Worker Queue Pattern

**Decision:** Follow health-score.queue.ts pattern for data-quality-score queue (cron); follow commission-calculation queue pattern for data-import queue (triggered).
**Rationale:** Two established patterns: cron-based (health-score, commission-statement) and event-triggered (commission-calculation, order-approval). Import is triggered per upload; quality scorecard is nightly cron.

**Queue config pattern:**
```typescript
export const DATA_IMPORT_QUEUE_NAME = 'data-import';
export interface DataImportJobData {
  importId: string;
  tenantId: string;
  entityType: string;
}
```

## Decision 6: Shared Schema Pattern

**Decision:** Create `admin.schema.ts` in packages/shared alongside existing `user.schema.ts`. Keep user response schema in user.schema.ts; add admin input/query schemas in admin.schema.ts.
**Rationale:** Avoids breaking existing user.schema.ts imports. Admin schemas are a superset of user schemas — creation, update, list, import, quality.
**Alternatives:** Extend user.schema.ts — rejected because import/quality schemas are not user-related.

## Decision 7: File Upload Handling

**Decision:** Use `@fastify/multipart` for file uploads. Parse CSV with Node.js built-in or `csv-parse` library. Parse Excel with `exceljs` library.
**Rationale:** Fastify has official multipart support. csv-parse is lightweight and streaming-capable. exceljs handles XLSX reading without native dependencies.
**Alternatives:** `xlsx` (SheetJS) — rejected due to larger bundle size. `multer` — Express-only, not Fastify-compatible.

**Import processing flow:**
1. Route receives multipart upload → validates file type + size
2. Parses file to rows → validates each row against Layout of Truth (Zod schemas)
3. Returns preview response (row counts, errors) → waits for confirmation
4. On confirmation, enqueues BullMQ job → processes in batches of 500
5. Each batch in a transaction → updates import record with progress
6. On completion, writes audit trail + updates import status
