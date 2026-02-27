# Conflict Analysis: Commissions (008)

## Summary

**Risk Level:** LOW — No breaking changes detected.

| Classification | Count | Details |
|---------------|-------|---------|
| SAFE | 9 | New models, new domain files, new jobs, new migrations, new enums, audit log (generic), roles (pre-configured) |
| ADDITIVE | 4 | app.ts route registration, shared schemas index, ERROR_CODES constant, prisma schema new models |
| BREAKING | 0 | None |

## SAFE Findings

1. **prisma/schema.prisma — new models**: CommissionRule, CommissionEntry, CommissionStatement, CommissionDispute, CommissionExport are all new entities. No existing models need modification.
2. **backend/src/domains/commissions/**: Directory already exists (empty). All new service/route files.
3. **worker/src/jobs/**: New commission-calculation and statement-generation job handlers.
4. **Prisma migrations**: New additive-only migration for commission tables, indexes, and RLS policies.
5. **New enums**: CommissionStatus, DisputeStatus, CommissionEntryType — no modifications to existing enums.
6. **AuditLog**: Entity-agnostic pattern, no changes needed — just new entityType values.
7. **User roles**: `read:commissions` and `write:commissions` already configured in ROLE_PERMISSIONS.
8. **Existing model fields**: Brand.commissionRate, Territory.commissionModifier, OrderLineItem.commissionRate already exist and support commission calculations.
9. **RevenueModel enum**: Already distinguishes broker vs. wholesale for filtering eligible orders.

## ADDITIVE Findings

1. **backend/src/app.ts**: Add `commissionRoutes` registration (new import + register call, no existing lines changed).
2. **packages/shared/src/schemas/**: New `commission.schema.ts` file + export from `index.ts`.
3. **packages/shared/src/constants/index.ts**: Add ~10 new error codes to ERROR_CODES object.
4. **prisma/schema.prisma**: Add 5 new model blocks and 5 new enum definitions at end of file.

## BREAKING Findings

None.

## Gate Decision

**PROCEED** — All findings are SAFE or ADDITIVE.
