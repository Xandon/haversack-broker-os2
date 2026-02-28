# Implementation Plan: Account List & Search

**Branch**: `016-account-list` | **Date**: 2026-02-27 | **Spec**: specs/016-account-list/spec.md

## Summary

Build the /accounts page — a filterable, sortable, paginated data table showing CRM accounts. The frontend consumes the existing GET /api/accounts endpoint and a new GET /api/territories endpoint. All filter/sort/pagination state syncs to URL query parameters for shareability. Role-based scoping is handled by the backend (reps see their territories only). Uses the DataTable composite from F-000 and the apiClient/TanStack Query patterns established in prior features.

## Technical Context

**Language/Version**: TypeScript 5.4+, Node.js 20 LTS
**Primary Dependencies**: Next.js 14+ (App Router), TanStack Query v5, TanStack Table, shadcn/ui, Tailwind CSS, Fastify 4+, Prisma 5+
**Storage**: PostgreSQL 16+ (existing schema — no migrations)
**Testing**: Vitest (unit/integration), Playwright (E2E)
**Target Platform**: Web (320px-1440px responsive)
**Performance Goals**: FCP < 2s on 4G, API p95 < 200ms, filter/sort updates < 200ms
**Constraints**: Cursor-based pagination (no offset), 20 items/page default

## Project Structure

### File Plan

```text
# BACKEND (2 new, 2 modified)
backend/src/domains/territories/                    # NEW directory
backend/src/domains/territories/territory.routes.ts # NEW — GET /api/territories
backend/src/domains/territories/territory.routes.test.ts # NEW — route tests
backend/src/domains/accounts/account.service.ts     # MOD — add territory include to listAccounts
backend/src/app.ts                                  # MOD — register territoryRoutes

# SHARED (1 modified)
packages/shared/src/schemas/territory.schema.ts     # NEW — territory list response schema
packages/shared/src/index.ts                        # MOD — export territory schema

# FRONTEND — Page (2 new)
frontend/src/app/(authenticated)/accounts/page.tsx          # NEW — account list page
frontend/src/app/(authenticated)/accounts/loading.tsx       # NEW — skeleton loading state

# FRONTEND — Components (4 new)
frontend/src/components/accounts/account-columns.tsx    # NEW — column definitions
frontend/src/components/accounts/account-filters.tsx    # NEW — filter bar component
frontend/src/components/accounts/health-score-badge.tsx # NEW — color-coded health badge
frontend/src/components/accounts/account-empty-state.tsx # NEW — empty/filtered-empty states

# FRONTEND — Hooks (2 new)
frontend/src/hooks/use-accounts.ts              # NEW — TanStack Query hook for account list
frontend/src/hooks/use-territories.ts           # NEW — TanStack Query hook for territories

# FRONTEND — Tests (5 new)
frontend/src/hooks/use-accounts.test.ts         # NEW — hook tests
frontend/src/hooks/use-territories.test.ts      # NEW — hook tests
frontend/src/components/accounts/account-filters.test.tsx  # NEW — filter component tests
frontend/src/components/accounts/health-score-badge.test.tsx # NEW — badge rendering tests
frontend/src/components/accounts/account-columns.test.tsx  # NEW — column definition tests

# E2E (1 new)
e2e/tests/account-list.spec.ts                  # NEW — Playwright E2E tests
```

**Totals**: 16 new files, 3 modified files = 19 files

### Modified File Details

1. **backend/src/domains/accounts/account.service.ts** (ADDITIVE)
   - Add `include: { territory: { select: { id: true, name: true } } }` to the `findMany` call in `listAccounts`
   - Update return type to include territory relation

2. **backend/src/app.ts** (ADDITIVE)
   - Import `territoryRoutes` from `./domains/territories/territory.routes`
   - Add `await app.register(territoryRoutes)` to route registration

3. **packages/shared/src/index.ts** (ADDITIVE)
   - Export territory schema types

## Data Model

### Territory (existing, no changes)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| tenantId | UUID | Tenant isolation |
| name | string | Display name |
| region | string | Region grouping |
| isActive | boolean | Filter active only |

### Account (existing, no changes)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| tenantId | UUID | Tenant isolation |
| name | string | Display in table |
| accountType | enum(retail, restaurant, distributor) | Filter + display |
| territoryId | UUID | FK to Territory |
| healthScore | int? (0-100) | Filter + badge display |
| updatedAt | DateTime | Sort + display |

### Health Score Badge Mapping

| Range | Label | Color |
|-------|-------|-------|
| 70-100 | Healthy | Green (bg-green-100 text-green-800) |
| 40-69 | Needs Attention | Yellow (bg-yellow-100 text-yellow-800) |
| 0-39 | At Risk | Red (bg-red-100 text-red-800) |
| null | No Score | Gray (bg-gray-100 text-gray-500) |

## API Contracts

### GET /api/territories (NEW)

**Auth**: Required (any authenticated role)
**Query**: none
**Response**:
```json
{
  "data": [
    { "id": "uuid", "name": "Portland Metro", "region": "Oregon" }
  ]
}
```

### GET /api/accounts (EXISTING — no changes)

**Auth**: Required (any authenticated role)
**Query** (from accountListQuerySchema):
- `search?`: string (min 3 chars)
- `territoryId?`: UUID
- `accountType?`: retail | restaurant | distributor
- `healthScoreMin?`: number (0-100)
- `healthScoreMax?`: number (0-100)
- `cursor?`: string (account UUID)
- `limit?`: number (1-100, default 20)
- `sortBy?`: name | createdAt | healthScore | updatedAt (default: name)
- `sortOrder?`: asc | desc (default: asc)

**Response** (after ADDITIVE modification):
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Pacific Foods Co.",
      "accountType": "restaurant",
      "territoryId": "uuid",
      "territory": { "id": "uuid", "name": "Portland Metro" },
      "healthScore": 75,
      "updatedAt": "2026-02-27T10:00:00Z"
    }
  ],
  "pagination": {
    "cursor": "uuid-or-null",
    "hasMore": true,
    "total": 87
  }
}
```

## Complexity Tracking

No constitution violations. All patterns follow established codebase conventions.
