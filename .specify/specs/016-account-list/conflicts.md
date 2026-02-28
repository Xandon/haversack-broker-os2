# Conflict Analysis — F-002a: Account List & Search

**Generated**: 2026-02-27
**Baseline**: dev branch (post F-001 merge)

## Schema Conflicts

| Item | Classification | Details |
|------|---------------|---------|
| Account model | SAFE | No schema changes needed. Account model has all required fields (name, accountType, territoryId, healthScore, updatedAt). Territory relation already defined. |
| Territory model | SAFE | No schema changes needed. Model has id, name, region, isActive fields. |
| No new migrations | SAFE | No Prisma schema changes required for this feature. |

## Route Conflicts

| Item | Classification | Details |
|------|---------------|---------|
| GET /api/accounts | SAFE | Already exists in account.routes.ts — frontend consumes existing endpoint. |
| GET /api/territories (NEW) | ADDITIVE | New route needed for territory dropdown filter. Does not conflict with existing routes in app.ts. |
| app.ts registration | ADDITIVE | Need to import and register territoryRoutes in app.ts. |

## Backend Service Conflicts

| Item | Classification | Details |
|------|---------------|---------|
| listAccounts service | ADDITIVE | Need to add `include: { territory: { select: { id: true, name: true } } }` to the Prisma query. Return type changes from `Account[]` to `(Account & { territory: { id: string; name: string } })[]`. |
| Account response type | ADDITIVE | Response includes territory relation data — existing consumers receive additional data (backward compatible). |

## Shared Schema Conflicts

| Item | Classification | Details |
|------|---------------|---------|
| accountListQuerySchema | SAFE | No changes needed — existing schema supports all required query params. |
| New territory schema | ADDITIVE | Add territoryListSchema to packages/shared if needed for response typing. |
| packages/shared/index.ts | ADDITIVE | Export new territory types if added. |

## Frontend Component Conflicts

| Item | Classification | Details |
|------|---------------|---------|
| data-table.tsx | SAFE | Existing composite component consumed as-is. No modifications needed. |
| health-score-badge.tsx (NEW) | SAFE | New component, no conflicts. |
| account-list-page (NEW) | SAFE | New page at frontend/src/app/(dashboard)/accounts/page.tsx. Path doesn't conflict. |
| account-filters (NEW) | SAFE | New component. |
| Navigation/sidebar | ADDITIVE | Need to add /accounts link to dashboard sidebar/navigation. |

## Frontend Hook Conflicts

| Item | Classification | Details |
|------|---------------|---------|
| useAccounts (NEW) | SAFE | New TanStack Query hook. |
| useAccountFilters (NEW) | SAFE | New filter state management hook. |
| useTerritories (NEW) | SAFE | New hook for territory dropdown data. |

## Summary

| Classification | Count | Items |
|---------------|-------|-------|
| SAFE | 12 | Schema, existing routes, shared schemas, new components/hooks |
| ADDITIVE | 5 | listAccounts include, territory route, app.ts registration, navigation, shared exports |
| BREAKING | 0 | — |

**GATE RESULT**: ALL SAFE or ADDITIVE — proceed to next step.
