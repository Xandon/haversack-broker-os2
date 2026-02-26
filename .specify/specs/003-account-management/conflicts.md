# Conflict Analysis: Account Management

**Feature:** 003-account-management
**Date:** 2026-02-26

## Schema Conflicts

| Item | Type | Details |
|------|------|---------|
| New `Account` model | SAFE | New model in prisma/schema.prisma — no existing models modified |
| New `Contact` model | SAFE | New model in prisma/schema.prisma — no existing models modified |
| New `AccountHealthScore` model | SAFE | New model in prisma/schema.prisma — no existing models modified |
| New `AccountType` enum | SAFE | New enum in prisma/schema.prisma |
| `Territory` model relation | ADDITIVE | Add `accounts Account[]` relation field to existing Territory model |
| `User` model relation | ADDITIVE | Add `accounts Account[]` relation field for territory-based lookups (optional, via UserTerritory) |
| pg_trgm extension | SAFE | Add via migration `CREATE EXTENSION IF NOT EXISTS pg_trgm` — does not affect existing data |
| RLS policies on accounts | SAFE | New RLS policies for new tables only |
| New migration file | SAFE | Additive migration — no destructive changes to existing tables |

## Route Conflicts

| Item | Type | Details |
|------|------|---------|
| `POST /api/accounts` | SAFE | New route — no existing `/api/accounts` route |
| `GET /api/accounts` | SAFE | New route — list/search endpoint |
| `GET /api/accounts/:id` | SAFE | New route — detail endpoint |
| `PUT /api/accounts/:id` | SAFE | New route — update endpoint |
| `DELETE /api/accounts/:id` | SAFE | New route — soft-delete endpoint |
| `GET /api/accounts/:id/duplicates` | SAFE | New route — duplicate check endpoint |
| `POST /api/accounts/:id/contacts` | SAFE | New route — add contact |
| `PUT /api/accounts/:id/contacts/:contactId` | SAFE | New route — update contact |
| `DELETE /api/accounts/:id/contacts/:contactId` | SAFE | New route — soft-delete contact |
| `app.ts` route registration | ADDITIVE | Add `import { accountRoutes }` and `app.register(accountRoutes)` to existing app.ts |

## Shared Schema Conflicts

| Item | Type | Details |
|------|------|---------|
| New `account.schema.ts` | SAFE | New file in packages/shared/src/schemas/ |
| New `contact.schema.ts` | SAFE | New file in packages/shared/src/schemas/ |
| `packages/shared/src/index.ts` | ADDITIVE | Add exports for new account and contact schemas |
| `constants/index.ts` | ADDITIVE | Add account-related error codes to ERROR_CODES |

## Component Conflicts

| Item | Type | Details |
|------|------|---------|
| N/A | SAFE | No frontend components modified — all new files in new directories |

## Hook Conflicts

| Item | Type | Details |
|------|------|---------|
| N/A | SAFE | No existing hooks modified — all new files |

## Worker Conflicts

| Item | Type | Details |
|------|------|---------|
| New health score job | SAFE | New files in worker/src/jobs/ and worker/src/queues/ |

## Summary

| Classification | Count |
|---------------|-------|
| SAFE | 18 |
| ADDITIVE | 4 |
| BREAKING | 0 |

**GATE: PASS** — All changes are SAFE or ADDITIVE. No BREAKING conflicts detected.

### ADDITIVE Changes (details for implementation):

1. **prisma/schema.prisma**: Add `accounts Account[]` relation to `Territory` model (1 line)
2. **backend/src/app.ts**: Add import and registration for `accountRoutes` (2 lines)
3. **packages/shared/src/index.ts**: Add export statements for new account/contact schemas (~10 lines)
4. **packages/shared/src/constants/index.ts**: Add account-related error codes (~5 lines)
