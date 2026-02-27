# Implementation Plan: Admin & Data Import

**Branch**: `009-admin-import` | **Date**: 2026-02-27 | **Spec**: `009-admin-import/spec.md`

## Summary

Admin-only user management (CRUD with role assignment, deactivation, session invalidation), CSV/Excel data import with Layout of Truth validation and preview/confirm workflow, and nightly data quality scorecard. Backend API + worker jobs, following established domain patterns.

## Technical Context

**Language/Version**: TypeScript 5.4+ / Node.js 20 LTS
**Primary Dependencies**: Fastify 4+, Prisma 5+, BullMQ, Zod, @fastify/multipart, csv-parse, exceljs
**Storage**: PostgreSQL 16+ with RLS
**Testing**: Vitest (unit/integration), Supertest (API)
**Target Platform**: Docker containers (backend + worker)
**Performance Goals**: API p95 <200ms, import 1K rows <30s
**Constraints**: File uploads <50 MB, import batches of 500 rows

## File Structure

### NEW Files (19)

| # | File | Workspace | Purpose |
|---|------|-----------|---------|
| 1 | `packages/shared/src/schemas/admin.schema.ts` | shared | Zod schemas for user management, import, quality scorecard |
| 2 | `backend/src/domains/admin/user.service.ts` | backend | User CRUD: create, get, list, update, deactivate, reactivate |
| 3 | `backend/src/domains/admin/user.routes.ts` | backend | 5 routes: GET/POST /api/admin/users, GET/PUT/DELETE /api/admin/users/:id |
| 4 | `backend/src/domains/admin/import.service.ts` | backend | Import: parse CSV/XLSX, validate against LoT, preview, execute |
| 5 | `backend/src/domains/admin/import.routes.ts` | backend | 4 routes: POST upload, GET preview, POST confirm, GET history |
| 6 | `backend/src/domains/admin/layout-of-truth.service.ts` | backend | Generate field definitions from Prisma schema + Zod schemas |
| 7 | `backend/src/domains/admin/quality.service.ts` | backend | Calculate data quality metrics, store snapshot |
| 8 | `backend/src/domains/admin/quality.routes.ts` | backend | 2 routes: GET scorecard, GET metric drill-down |
| 9 | `worker/src/queues/data-import.queue.ts` | worker | Queue name, cron, job data interface |
| 10 | `worker/src/queues/data-quality-score.queue.ts` | worker | Queue name, cron (03:00 UTC), job data interface |
| 11 | `worker/src/jobs/data-import.job.ts` | worker | Process import batches of 500 rows |
| 12 | `worker/src/jobs/data-quality-score.job.ts` | worker | Calculate and store quality metrics |
| 13 | `backend/src/domains/admin/user.service.test.ts` | backend | Unit tests for user service |
| 14 | `backend/src/domains/admin/user.routes.test.ts` | backend | Integration tests for user routes |
| 15 | `backend/src/domains/admin/import.service.test.ts` | backend | Unit tests for import service |
| 16 | `backend/src/domains/admin/import.routes.test.ts` | backend | Integration tests for import routes |
| 17 | `backend/src/domains/admin/quality.service.test.ts` | backend | Unit tests for quality service |
| 18 | `backend/src/domains/admin/quality.routes.test.ts` | backend | Integration tests for quality routes |
| 19 | `packages/shared/src/schemas/admin.schema.test.ts` | shared | Schema validation tests |

### MODIFIED Files (5)

| # | File | Workspace | Changes |
|---|------|-----------|---------|
| 1 | `prisma/schema.prisma` | root | Add DataImport model, DataQualityScore model, DataImportStatus enum, DataImportEntityType enum |
| 2 | `backend/src/app.ts` | backend | Import + register adminRoutes (user + import + quality) |
| 3 | `worker/src/index.ts` | worker | Import + register data-import queue + data-quality-score queue |
| 4 | `packages/shared/src/index.ts` | shared | Export admin schemas |
| 5 | `backend/package.json` | backend | Add csv-parse, exceljs, @fastify/multipart dependencies |

## API Contracts

### User Management (admin only)

```
POST   /api/admin/users          — Create user (email, name, role, territoryIds)
GET    /api/admin/users          — List users (role?, isActive?, page, limit)
GET    /api/admin/users/:id      — Get user detail
PUT    /api/admin/users/:id      — Update user (role, territories, isActive)
DELETE /api/admin/users/:id      — Soft-delete user (deactivate + invalidate sessions)
```

### Data Import (admin only)

```
POST   /api/admin/imports/upload — Upload CSV/XLSX file (multipart)
GET    /api/admin/imports/:id/preview — Get validation preview
POST   /api/admin/imports/:id/confirm — Confirm import of valid rows
GET    /api/admin/imports        — List import history
GET    /api/admin/imports/:id    — Get import detail + error log
```

### Data Quality (admin + manager)

```
GET    /api/admin/quality/scorecard   — Current scorecard with all metrics
GET    /api/admin/quality/drill-down  — Filtered list for a specific metric
```

### Layout of Truth (admin only)

```
GET    /api/admin/layout-of-truth/:entityType — Field definitions for entity
```

## Data Model Additions

### DataImport

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key |
| tenantId | UUID | Yes | Tenant isolation |
| createdBy | UUID | Yes | FK → User |
| entityType | DataImportEntityType | Yes | account, contact, product, order |
| filename | VARCHAR(255) | Yes | Original filename |
| fileSize | INT | Yes | Bytes |
| totalRows | INT | Yes | Total parsed rows |
| validRows | INT | Yes | Rows passing validation |
| errorRows | INT | Yes | Rows failing validation |
| createdRows | INT | No | Rows created (after import) |
| updatedRows | INT | No | Rows updated (after import) |
| skippedRows | INT | No | Rows skipped (after import) |
| status | DataImportStatus | Yes | pending, validating, previewed, processing, completed, failed |
| errorLog | JSON | No | Array of {row, field, error} |
| parsedData | JSON | No | Temporary parsed rows for preview (cleared after import) |
| createdAt | TIMESTAMP | Yes | Auto |
| updatedAt | TIMESTAMP | Yes | Auto |

### DataQualityScore

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key |
| tenantId | UUID | Yes | Tenant isolation |
| accountCompleteness | FLOAT | Yes | % of accounts with complete required fields |
| contactEmailValidity | FLOAT | Yes | % of contacts with valid email format |
| productImages | FLOAT | Yes | % of products with images |
| duplicateAccountCount | INT | Yes | Number of potential duplicate accounts |
| staleAccountCount | INT | Yes | Accounts with no activity in 90+ days |
| compositeScore | FLOAT | Yes | Weighted average (20% each) |
| calculatedAt | TIMESTAMP | Yes | When calculated |
| createdAt | TIMESTAMP | Yes | Auto |

## Batch Grouping

| Batch | Name | Tasks | Focus |
|-------|------|-------|-------|
| 22 | admin-schema-users | T160-T167 | Prisma models, shared schemas, user CRUD service + routes |
| 23 | admin-import | T168-T175 | Import service (CSV/XLSX parsing, LoT validation, preview/confirm), routes, worker job |
| 24 | admin-quality-polish | T176-T181 | Quality scorecard service + routes, worker cron job, RBAC, audit, edge cases |
