# Implementation Plan: Dashboards & Reports

**Branch**: `011-dashboards-reports` | **Date**: 2026-02-26 | **Spec**: `011-dashboards-reports/spec.md`

## Summary

Implement backend API endpoints for Rep KPI dashboards, Manager team dashboards, and a custom report builder with CSV/XLSX export. Uses Prisma aggregation queries over existing data models (orders, commissions, opportunities, activities, accounts) with tenant isolation and RBAC enforcement. No new UI pages — backend-only API.

## Technical Context

**Language/Version**: TypeScript 5.4+ (strict mode), Node.js 20 LTS
**Primary Dependencies**: Fastify 4+, Prisma 5+, Zod, ExcelJS (new dep for XLSX export)
**Storage**: PostgreSQL 16+ (existing models), Redis 7+ (concurrent report limiter)
**Testing**: Vitest (unit/integration)
**Target Platform**: Linux server (Docker)
**Performance Goals**: Rep dashboard <200ms p95, Team dashboard <2s, Report execution <5s, Export <10s
**Constraints**: Max 10K rows in-app, 50K rows export, 3 concurrent reports per tenant

## Project Structure

### Source Code

```text
backend/src/domains/dashboards/           # Dashboard domain (directory exists, empty)
├── rep-dashboard.service.ts              # NEW — Rep KPI aggregation service
├── team-dashboard.service.ts             # NEW — Manager team aggregation service
├── dashboard-date.util.ts                # NEW — Date range resolution utility
├── dashboard.routes.ts                   # NEW — Fastify route handlers for dashboards
└── __tests__/
    ├── rep-dashboard.service.test.ts     # NEW — Rep dashboard unit tests
    ├── team-dashboard.service.test.ts    # NEW — Team dashboard unit tests
    ├── dashboard-date.util.test.ts       # NEW — Date utility unit tests
    └── dashboard.routes.test.ts          # NEW — Dashboard route integration tests

backend/src/domains/reports/              # NEW — Reports domain
├── report.service.ts                     # NEW — CRUD for saved report definitions
├── report-executor.service.ts            # NEW — Dynamic query builder + execution
├── report-export.service.ts              # NEW — CSV/XLSX export generation
├── column-registry.ts                    # NEW — Entity column definitions
├── report.routes.ts                      # NEW — Fastify route handlers for reports
└── __tests__/
    ├── report.service.test.ts            # NEW — Report CRUD unit tests
    ├── report-executor.service.test.ts   # NEW — Query builder unit tests
    ├── report-export.service.test.ts     # NEW — Export generation tests
    ├── column-registry.test.ts           # NEW — Column registry tests
    └── report.routes.test.ts             # NEW — Report route integration tests

packages/shared/src/schemas/
├── dashboard.schema.ts                   # NEW — Dashboard Zod schemas
└── report.schema.ts                      # NEW — Report Zod schemas

prisma/
└── schema.prisma                         # MODIFIED — Add SavedReport model

backend/src/app.ts                        # MODIFIED — Register dashboard + report routes
packages/shared/src/schemas/index.ts      # MODIFIED — Export new schemas
```

## File Inventory

| # | File | Status | Workspace | Purpose |
|---|------|--------|-----------|---------|
| 1 | `prisma/schema.prisma` | MODIFIED | root | Add SavedReport model |
| 2 | `packages/shared/src/schemas/dashboard.schema.ts` | NEW | shared | Dashboard query/response Zod schemas |
| 3 | `packages/shared/src/schemas/report.schema.ts` | NEW | shared | Report CRUD/execute/export Zod schemas |
| 4 | `packages/shared/src/schemas/index.ts` | MODIFIED | shared | Export new schemas |
| 5 | `backend/src/domains/dashboards/dashboard-date.util.ts` | NEW | backend | Date range resolution (period enum → date bounds) |
| 6 | `backend/src/domains/dashboards/rep-dashboard.service.ts` | NEW | backend | Rep KPI aggregation: revenue, activities, opportunities, commissions, health |
| 7 | `backend/src/domains/dashboards/team-dashboard.service.ts` | NEW | backend | Team aggregation: rankings, monthly revenue, pipeline forecast, territory |
| 8 | `backend/src/domains/dashboards/dashboard.routes.ts` | NEW | backend | 6 dashboard GET endpoints with auth/RBAC |
| 9 | `backend/src/domains/reports/column-registry.ts` | NEW | backend | Entity-to-column mapping for 5 entity types |
| 10 | `backend/src/domains/reports/report.service.ts` | NEW | backend | SavedReport CRUD (create, get, list, delete) |
| 11 | `backend/src/domains/reports/report-executor.service.ts` | NEW | backend | Dynamic Prisma query builder + paginated execution |
| 12 | `backend/src/domains/reports/report-export.service.ts` | NEW | backend | CSV (with BOM) and XLSX (ExcelJS streaming) generation |
| 13 | `backend/src/domains/reports/report.routes.ts` | NEW | backend | 6 report endpoints with auth/RBAC |
| 14 | `backend/src/app.ts` | MODIFIED | backend | Register dashboardRoutes + reportRoutes |
| 15 | `backend/src/domains/dashboards/__tests__/rep-dashboard.service.test.ts` | NEW | backend | Rep dashboard tests |
| 16 | `backend/src/domains/dashboards/__tests__/team-dashboard.service.test.ts` | NEW | backend | Team dashboard tests |
| 17 | `backend/src/domains/dashboards/__tests__/dashboard-date.util.test.ts` | NEW | backend | Date utility tests |
| 18 | `backend/src/domains/dashboards/__tests__/dashboard.routes.test.ts` | NEW | backend | Dashboard route integration tests |
| 19 | `backend/src/domains/reports/__tests__/report.service.test.ts` | NEW | backend | Report CRUD tests |
| 20 | `backend/src/domains/reports/__tests__/report-executor.service.test.ts` | NEW | backend | Query builder tests |
| 21 | `backend/src/domains/reports/__tests__/report-export.service.test.ts` | NEW | backend | Export tests |
| 22 | `backend/src/domains/reports/__tests__/column-registry.test.ts` | NEW | backend | Column registry tests |
| 23 | `backend/src/domains/reports/__tests__/report.routes.test.ts` | NEW | backend | Report route integration tests |

**Total: 23 files (20 new, 3 modified)**

## Modification Details

### prisma/schema.prisma — ADDITIVE
- Add `SavedReport` model with fields: id (UUID), tenantId, createdById, name, description, entityType (enum), filters (JSON), columns (String[]), isShared, lastRunAt, deletedAt, timestamps
- Add `ReportEntityType` enum: ACCOUNT, ORDER, PRODUCT, COMMISSION, ACTIVITY
- Add relation: SavedReport.createdBy → User

### backend/src/app.ts — ADDITIVE
- Add imports: `dashboardRoutes` from `./domains/dashboards/dashboard.routes`
- Add imports: `reportRoutes` from `./domains/reports/report.routes`
- Add registrations: `await app.register(dashboardRoutes)` and `await app.register(reportRoutes)`

### packages/shared/src/schemas/index.ts — ADDITIVE
- Add export lines for `dashboard.schema` and `report.schema`
