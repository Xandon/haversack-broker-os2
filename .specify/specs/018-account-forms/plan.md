# Implementation Plan: Account Forms and Contacts (F-002c)

**Branch**: `018-account-forms` | **Date**: 2026-02-28 | **Spec**: spec.md
**Input**: Feature specification from `/specs/018-account-forms/spec.md`

## Summary

Implement account creation (/accounts/new) and edit (/accounts/[id]/edit) pages using React Hook Form with Zod validation. Includes duplicate detection on name blur, territory-scoped dropdowns, and inline primary contact during creation. All backend APIs and shared schemas already exist — this is a frontend-only feature.

## Technical Context

**Language/Version**: TypeScript 5.4+ (strict mode)
**Primary Dependencies**: React 18+, Next.js 14+ (App Router), React Hook Form, Zod, TanStack Query v5, shadcn/ui
**Storage**: N/A (uses existing backend APIs)
**Testing**: Vitest (component tests)
**Target Platform**: Web (mobile-first, 320px+)
**Project Type**: Web application (monorepo frontend workspace)
**Performance Goals**: Form load <2s, duplicate check <500ms, form submission <3s
**Constraints**: Must use shared Zod schemas from `@haversack/shared`, must follow existing component patterns
**Scale/Scope**: 2 new pages, 3 new components, 2 new hooks, ~6 test files

## Constitution Check

- [x] No new dependencies required
- [x] Uses existing shared schemas (no duplication)
- [x] Follows App Router patterns (page.tsx, loading.tsx)
- [x] Uses React Hook Form + Zod (mandated by CLAUDE.md)
- [x] Uses TanStack Query for server state (mandated)
- [x] Mobile-first design (mandated)
- [x] Named exports only (mandated)

## Project Structure

### Source Code

```text
frontend/src/
├── app/(authenticated)/accounts/
│   ├── new/
│   │   ├── page.tsx              # NEW — Create account page
│   │   └── loading.tsx           # NEW — Skeleton loader
│   └── [id]/
│       └── edit/
│           ├── page.tsx          # NEW — Edit account page
│           └── loading.tsx       # NEW — Skeleton loader
├── components/accounts/
│   ├── account-form.tsx          # NEW — Shared form component (create + edit)
│   ├── account-form.test.tsx     # NEW — Form component tests
│   ├── duplicate-warning-dialog.tsx     # NEW — Duplicate detection dialog
│   └── duplicate-warning-dialog.test.tsx # NEW — Dialog tests
├── hooks/
│   ├── use-create-account.ts     # NEW — Create account mutation hook
│   ├── use-create-account.test.ts # NEW — Hook tests
│   ├── use-check-duplicates.ts   # NEW — Duplicate check query hook
│   └── use-check-duplicates.test.ts # NEW — Hook tests
```

### Modified Files

```text
frontend/src/app/(authenticated)/accounts/page.tsx  # MODIFIED — Add "New Account" button
```

**Structure Decision**: All new files within the existing `frontend/` workspace. No backend changes. Follows the established domain-organized structure for accounts components and hooks.

## File Details

### NEW Files

| File | Workspace | Purpose |
|------|-----------|---------|
| `frontend/src/app/(authenticated)/accounts/new/page.tsx` | frontend | Create account page — renders AccountForm in create mode |
| `frontend/src/app/(authenticated)/accounts/new/loading.tsx` | frontend | Skeleton loader for create page |
| `frontend/src/app/(authenticated)/accounts/[id]/edit/page.tsx` | frontend | Edit account page — fetches account, renders AccountForm in edit mode |
| `frontend/src/app/(authenticated)/accounts/[id]/edit/loading.tsx` | frontend | Skeleton loader for edit page |
| `frontend/src/components/accounts/account-form.tsx` | frontend | Shared form: mode prop (create/edit), React Hook Form + Zod, territory select, inline contact (create only), name blur duplicate check |
| `frontend/src/components/accounts/account-form.test.tsx` | frontend | Component tests for AccountForm |
| `frontend/src/components/accounts/duplicate-warning-dialog.tsx` | frontend | Dialog showing duplicate matches with "View Existing" links and "Create Anyway" action |
| `frontend/src/components/accounts/duplicate-warning-dialog.test.tsx` | frontend | Component tests for DuplicateWarningDialog |
| `frontend/src/hooks/use-create-account.ts` | frontend | useMutation wrapping POST /api/accounts, invalidates accounts list |
| `frontend/src/hooks/use-create-account.test.ts` | frontend | Hook tests |
| `frontend/src/hooks/use-check-duplicates.ts` | frontend | Lazy query wrapping GET /api/accounts/check-duplicates, triggered manually on blur |
| `frontend/src/hooks/use-check-duplicates.test.ts` | frontend | Hook tests |

### MODIFIED Files

| File | Workspace | Changes |
|------|-----------|---------|
| `frontend/src/app/(authenticated)/accounts/page.tsx` | frontend | Add "New Account" button in page header linking to /accounts/new |

## Complexity Tracking

No constitution violations. All new files, one minor additive modification.
