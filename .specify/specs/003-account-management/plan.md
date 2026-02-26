# Implementation Plan: Account Management

**Branch**: `003-account-management` | **Date**: 2026-02-26 | **Spec**: `003-account-management/spec.md`

## Summary

Implement full account management CRUD with full-text search (pg_trgm), parent-child hierarchies with roll-up metrics, duplicate detection (Levenshtein), contact management, and health score calculation (nightly BullMQ job). Backend API only — follows established Fastify route + service patterns from the auth module.

## Technical Context

**Language/Version**: TypeScript 5.4+ (strict mode) on Node.js 20 LTS
**Primary Dependencies**: Fastify 4+, Prisma 5+, Zod, BullMQ
**Storage**: PostgreSQL 16+ with RLS, pg_trgm extension
**Testing**: Vitest (unit/integration), Supertest (API)
**Target Platform**: Docker container (backend service)
**Project Type**: Web service (REST API)
**Performance Goals**: Account creation <3s, detail <2s p95, search <200ms p95
**Constraints**: Tenant-isolated via RLS, RBAC enforced, immutable audit trail
**Scale/Scope**: ~500 accounts per tenant, 9 reps, ~50 brands

## Project Structure

### Source Code

```text
# Backend (Fastify API)
backend/src/domains/accounts/
├── account.routes.ts           # NEW — Fastify route handlers for /api/accounts
├── account.routes.test.ts      # NEW — Route integration tests
├── account.service.ts          # NEW — Account CRUD business logic
├── account.service.test.ts     # NEW — Service unit tests
├── account-search.service.ts   # NEW — Full-text search with pg_trgm
├── account-search.service.test.ts # NEW — Search service tests
├── duplicate.service.ts        # NEW — Duplicate detection (Levenshtein)
├── duplicate.service.test.ts   # NEW — Duplicate detection tests
├── contact.service.ts          # NEW — Contact CRUD
├── contact.service.test.ts     # NEW — Contact service tests
└── index.ts                    # NEW — Domain barrel export

# Backend (modified files)
backend/src/app.ts              # MODIFIED — Register accountRoutes

# Shared schemas
packages/shared/src/schemas/
├── account.schema.ts           # NEW — Account Zod schemas (create, update, response, search, list)
├── account.schema.test.ts      # NEW — Schema validation tests
├── contact.schema.ts           # NEW — Contact Zod schemas (create, update, response)
└── contact.schema.test.ts      # NEW — Contact schema tests

# Shared (modified files)
packages/shared/src/index.ts    # MODIFIED — Export account + contact schemas
packages/shared/src/constants/index.ts  # MODIFIED — Add account error codes

# Prisma
prisma/schema.prisma            # MODIFIED — Add Account, Contact, AccountHealthScore models + AccountType enum
prisma/migrations/XXXX_account_management/ # NEW — Migration with pg_trgm, models, RLS, indexes

# Worker (health score job)
worker/src/jobs/health-score.job.ts     # NEW — Nightly health score calculation
worker/src/jobs/health-score.job.test.ts # NEW — Health score calculation tests
worker/src/queues/health-score.queue.ts # NEW — BullMQ queue definition
```

### File Summary

| File | Status | Workspace | Purpose |
|------|--------|-----------|---------|
| `prisma/schema.prisma` | MODIFIED | root | Add Account, Contact, AccountHealthScore models, AccountType enum, Territory relation |
| `prisma/migrations/XXXX_account_management/` | NEW | root | Migration: pg_trgm extension, tables, RLS policies, GIN indexes, Levenshtein functions |
| `packages/shared/src/schemas/account.schema.ts` | NEW | shared | Zod schemas for account create/update/response/search/list |
| `packages/shared/src/schemas/account.schema.test.ts` | NEW | shared | Schema validation tests |
| `packages/shared/src/schemas/contact.schema.ts` | NEW | shared | Zod schemas for contact create/update/response |
| `packages/shared/src/schemas/contact.schema.test.ts` | NEW | shared | Schema validation tests |
| `packages/shared/src/index.ts` | MODIFIED | shared | Export new schemas |
| `packages/shared/src/constants/index.ts` | MODIFIED | shared | Add ACCOUNT_NOT_FOUND, ACCOUNT_DUPLICATE_DETECTED, etc. |
| `backend/src/domains/accounts/account.routes.ts` | NEW | backend | Route handlers: CRUD, search, duplicate check |
| `backend/src/domains/accounts/account.routes.test.ts` | NEW | backend | Integration tests with buildTestApp |
| `backend/src/domains/accounts/account.service.ts` | NEW | backend | Account CRUD with tenant isolation, audit trail |
| `backend/src/domains/accounts/account.service.test.ts` | NEW | backend | Unit tests with mocked Prisma |
| `backend/src/domains/accounts/account-search.service.ts` | NEW | backend | pg_trgm search with relevance ranking |
| `backend/src/domains/accounts/account-search.service.test.ts` | NEW | backend | Search unit tests |
| `backend/src/domains/accounts/duplicate.service.ts` | NEW | backend | Levenshtein fuzzy matching |
| `backend/src/domains/accounts/duplicate.service.test.ts` | NEW | backend | Duplicate detection tests |
| `backend/src/domains/accounts/contact.service.ts` | NEW | backend | Contact CRUD with audit trail |
| `backend/src/domains/accounts/contact.service.test.ts` | NEW | backend | Contact service tests |
| `backend/src/domains/accounts/index.ts` | NEW | backend | Domain barrel export |
| `backend/src/app.ts` | MODIFIED | backend | Register accountRoutes |
| `worker/src/jobs/health-score.job.ts` | NEW | worker | BullMQ job: calculate health scores |
| `worker/src/jobs/health-score.job.test.ts` | NEW | worker | Health score calculation tests |
| `worker/src/queues/health-score.queue.ts` | NEW | worker | Queue definition and scheduling |

**Totals:** 18 NEW files, 5 MODIFIED files = 23 files
