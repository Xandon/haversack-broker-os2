# Conflict Analysis: Account Forms and Contacts (F-002c)

**Feature**: 018-account-forms
**Date**: 2026-02-28

## Schema Conflicts

| Check | Status | Details |
|-------|--------|---------|
| Prisma models | SAFE | No schema modifications needed. Account, Contact, Territory models are stable. |
| Shared Zod schemas | SAFE | `createAccountSchema`, `updateAccountSchema`, `duplicateCheckQuerySchema` already exist in `packages/shared/src/schemas/account.schema.ts`. No changes needed. |

## Route Conflicts

| Check | Status | Details |
|-------|--------|---------|
| Backend routes | SAFE | All required endpoints already exist and are tested. No backend changes needed. |
| Frontend routes | SAFE | `/accounts/new` and `/accounts/[id]/edit` are NEW pages. No existing files to conflict with. |

## Component Conflicts

| Check | Status | Details |
|-------|--------|---------|
| AccountForm | SAFE | NEW component — `frontend/src/components/accounts/account-form.tsx` does not exist. |
| DuplicateWarningDialog | SAFE | NEW component — does not exist. |
| AccountDetailHeader | ADDITIVE | Already has an "Edit" button linking to `/accounts/[id]/edit`. No modification needed — just needs the target page to exist. |
| Account list page | ADDITIVE | May add a "New Account" button. Modification to existing `frontend/src/app/(authenticated)/accounts/page.tsx`. |

## Hook Conflicts

| Check | Status | Details |
|-------|--------|---------|
| useCreateAccount | SAFE | NEW hook — does not exist yet. |
| useCheckDuplicates | SAFE | NEW hook — does not exist yet. |
| useUpdateAccount | SAFE | Already exists in `use-account-detail.ts`. Will be reused, not modified. |
| useTerritories | SAFE | Already exists. Will be used as-is. |

## Summary

- **SAFE**: 10 checks
- **ADDITIVE**: 2 checks (account list page button, account detail header already wired)
- **BREAKING**: 0 checks

**Verdict**: All clear to proceed. No breaking changes.
