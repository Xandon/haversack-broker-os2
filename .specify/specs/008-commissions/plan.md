# Implementation Plan: Commissions

**Branch**: `008-commissions` | **Date**: 2026-02-26 | **Spec**: `008-commissions/spec.md`
**Input**: Feature specification from `/specs/008-commissions/spec.md`

## Summary

Implement commission rule configuration, automated commission calculation, monthly statement generation, statement approval workflow, QuickBooks CSV export, and dispute resolution. This feature adds 5 new Prisma models, a commission calculation engine (BullMQ job triggered on order confirmation), a monthly statement generation cron job, and 12 Fastify API endpoints. Follows established patterns from orders and opportunities domains.

## Technical Context

**Language/Version**: TypeScript 5.4+, Node.js 20 LTS
**Primary Dependencies**: Fastify 4+, Prisma 5+, BullMQ, Zod
**Storage**: PostgreSQL 16+ with RLS
**Testing**: Vitest (unit/integration), Supertest (API)
**Target Platform**: Docker containers (backend + worker)
**Project Type**: Web service (backend API + background jobs)
**Performance Goals**: API p95 <200ms, DB query p95 <50ms, statement generation <60s for 9 reps
**Constraints**: Deterministic calculations, immutable audit trail, tenant isolation via RLS
**Scale/Scope**: 9 reps, ~50 brands, ~100 orders/month

## Constitution Check

All gates pass:
- No new frameworks introduced
- No new external services added (QuickBooks is CSV export, not API)
- Follows existing domain organization pattern
- Uses established patterns (audit, RBAC, BullMQ, Zod)

## Project Structure

### Source Code

```text
# Backend domain (NEW directory, existing empty stub)
backend/src/domains/commissions/
├── commission-rule.service.ts          # NEW — CRUD for commission rules
├── commission-rule.service.test.ts     # NEW — Rule service tests
├── commission-calculation.service.ts   # NEW — Commission calculation engine
├── commission-calculation.service.test.ts # NEW — Calculation engine tests
├── commission-statement.service.ts     # NEW — Statement generation + approval
├── commission-statement.service.test.ts # NEW — Statement service tests
├── commission-dispute.service.ts       # NEW — Dispute filing + resolution
├── commission-dispute.service.test.ts  # NEW — Dispute service tests
├── commission-export.service.ts        # NEW — QuickBooks CSV export
├── commission-export.service.test.ts   # NEW — Export service tests
├── commission.routes.ts                # NEW — All commission API routes
└── commission.routes.test.ts           # NEW — Route integration tests

# Shared schemas (NEW file)
packages/shared/src/schemas/
└── commission.schema.ts                # NEW — Zod schemas for commission CRUD

# Worker jobs (NEW files)
worker/src/jobs/
├── commission-calculation.job.ts       # NEW — Calculate commissions on order confirm
└── commission-statement.job.ts         # NEW — Monthly statement generation cron

worker/src/queues/
├── commission-calculation.queue.ts     # NEW — Queue config for calculation job
└── commission-statement.queue.ts       # NEW — Queue config for statement cron

# Modified files
prisma/schema.prisma                    # MOD — Add 5 models + 4 enums
backend/src/app.ts                      # MOD — Register commission routes
packages/shared/src/index.ts            # MOD — Export commission schemas
packages/shared/src/constants/index.ts  # MOD — Add commission error codes
worker/src/index.ts                     # MOD — Register commission queues + workers
```

### File Summary

| File | Status | Workspace | Description |
|------|--------|-----------|-------------|
| `prisma/schema.prisma` | MOD | root | Add CommissionRule, CommissionEntry, CommissionStatement, CommissionDispute, CommissionExport models + enums |
| `packages/shared/src/schemas/commission.schema.ts` | NEW | shared | Zod schemas for all commission operations |
| `packages/shared/src/constants/index.ts` | MOD | shared | Add 10 commission error codes |
| `packages/shared/src/index.ts` | MOD | shared | Export commission schemas |
| `backend/src/domains/commissions/commission-rule.service.ts` | NEW | backend | CommissionRule CRUD with versioning + audit |
| `backend/src/domains/commissions/commission-rule.service.test.ts` | NEW | backend | Rule service unit tests |
| `backend/src/domains/commissions/commission-calculation.service.ts` | NEW | backend | Commission calculation engine (formula + tier lookup) |
| `backend/src/domains/commissions/commission-calculation.service.test.ts` | NEW | backend | Calculation determinism + edge case tests |
| `backend/src/domains/commissions/commission-statement.service.ts` | NEW | backend | Statement generation, approval, status transitions |
| `backend/src/domains/commissions/commission-statement.service.test.ts` | NEW | backend | Statement lifecycle tests |
| `backend/src/domains/commissions/commission-dispute.service.ts` | NEW | backend | Dispute filing + resolution + amount adjustment |
| `backend/src/domains/commissions/commission-dispute.service.test.ts` | NEW | backend | Dispute workflow tests |
| `backend/src/domains/commissions/commission-export.service.ts` | NEW | backend | QuickBooks CSV generation + export tracking |
| `backend/src/domains/commissions/commission-export.service.test.ts` | NEW | backend | Export format + idempotency tests |
| `backend/src/domains/commissions/commission.routes.ts` | NEW | backend | 12 Fastify route handlers |
| `backend/src/domains/commissions/commission.routes.test.ts` | NEW | backend | Route integration tests |
| `backend/src/app.ts` | MOD | backend | Register commissionRoutes |
| `worker/src/jobs/commission-calculation.job.ts` | NEW | worker | BullMQ job: calculate commissions for confirmed order |
| `worker/src/jobs/commission-statement.job.ts` | NEW | worker | BullMQ job: monthly statement generation |
| `worker/src/queues/commission-calculation.queue.ts` | NEW | worker | Queue config for calculation job |
| `worker/src/queues/commission-statement.queue.ts` | NEW | worker | Queue config + cron for statement generation |
| `worker/src/index.ts` | MOD | worker | Register commission queues + workers |

**Total: 22 files (17 new, 5 modified)**

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/commissions/rules` | admin | Create commission rule |
| GET | `/api/commissions/rules` | authenticated | List commission rules |
| GET | `/api/commissions/rules/:id` | authenticated | Get commission rule by ID |
| PUT | `/api/commissions/rules/:id` | admin | Update commission rule (creates new version) |
| GET | `/api/commissions/statements` | authenticated | List statements (rep sees own, manager sees team) |
| GET | `/api/commissions/statements/:id` | authenticated | Get statement with line-item breakdown |
| POST | `/api/commissions/statements/:id/approve` | manager | Approve pending statement |
| POST | `/api/commissions/statements/:id/reject` | manager | Reject statement with reason |
| POST | `/api/commissions/statements/generate` | admin | Manually trigger statement generation |
| POST | `/api/commissions/entries/:id/dispute` | rep, manager | File dispute on commission entry |
| POST | `/api/commissions/disputes/:id/resolve` | manager, admin | Resolve a dispute |
| POST | `/api/commissions/export` | admin | Trigger QuickBooks CSV export |

## Data Model

### New Enums

- `CommissionStatementStatus`: pending, approved, exported, paid
- `CommissionDisputeStatus`: open, resolved
- `CommissionEntryType`: calculation, reversal, credit

### New Models

**CommissionRule**: id, tenant_id, brand_id, territory_id?, base_rate (Decimal 5,4), territory_modifier (Decimal 4,2), volume_tiers (Json), effective_date, expires_at?, is_active, version, created_by, created_at, updated_at

**CommissionEntry**: id, tenant_id, order_id, order_line_item_id, rep_id, commission_rule_id, entry_type, base_rate, territory_modifier, volume_tier_applied, effective_rate, line_item_total, commission_amount, calculated_at, created_at

**CommissionStatement**: id, tenant_id, rep_id, month (Int), year (Int), status, total_earned (Decimal), ytd_total (Decimal), approved_by?, approved_at?, exported_at?, version, created_at, updated_at

**CommissionDispute**: id, tenant_id, statement_id, commission_entry_id, filed_by, reason, status, original_amount, adjusted_amount?, resolved_by?, resolved_at?, resolution_notes?, created_at, updated_at

**CommissionExport**: id, tenant_id, month (Int), year (Int), format, statement_ids (Json), file_content (Text), reference_id, status, created_by, created_at
