# Conflict Analysis — Feature 10: Dashboards & Reports

## Summary

| Area | Classification | Details |
|------|---------------|---------|
| Prisma Model (SavedReport) | SAFE | No existing model; clean addition |
| API Routes (/api/dashboards/*, /api/reports/*) | SAFE | No existing routes registered |
| Shared Schemas (dashboard, report) | SAFE | No existing schema files |
| Backend Domain (dashboards/) | SAFE | Directory pre-exists but is empty scaffold |
| Backend Domain (reports/) | SAFE | New directory needed |
| app.ts route registration | ADDITIVE | Need to add dashboard + report route imports and registrations |
| packages/shared/src/schemas/index.ts | ADDITIVE | Need to export new dashboard and report schemas |
| prisma/schema.prisma | ADDITIVE | Need to add SavedReport model |

## Detailed Findings

### 1. Prisma Schema — SAFE + ADDITIVE
- No `SavedReport` model exists in schema (868 lines checked)
- Adding SavedReport model is additive to existing schema
- No existing models need modification
- Migration will be additive (CREATE TABLE only)

### 2. API Routes — SAFE
- No `/api/dashboards` or `/api/reports` routes registered in `backend/src/app.ts`
- Current routes: auth, accounts, activities, email-records, tasks, orders, products, brands, opportunities, commissions, admin (3 sub-routes), ai
- New routes can be registered following established pattern

### 3. Shared Schemas — SAFE
- 29 existing schema files in `packages/shared/src/schemas/`
- No `dashboard.schema.ts` or `report.schema.ts` exists
- New files will not conflict with existing exports

### 4. Backend Domains — SAFE
- `backend/src/domains/dashboards/` exists as empty scaffold (no files)
- No `backend/src/domains/reports/` directory exists
- Can populate dashboards directory and create reports directory

### 5. app.ts Registration — ADDITIVE
- Need to add import lines for dashboardRoutes and reportRoutes
- Need to add `await app.register(dashboardRoutes)` and `await app.register(reportRoutes)` registrations
- No existing code needs to change

### 6. Shared Schema Index — ADDITIVE
- Need to add exports for new dashboard and report schemas to index
- No existing exports change

## Verdict

**ALL SAFE or ADDITIVE — proceed to planning.**

- 5 SAFE areas (new files only)
- 3 ADDITIVE areas (existing files modified by adding new lines)
- 0 BREAKING areas
