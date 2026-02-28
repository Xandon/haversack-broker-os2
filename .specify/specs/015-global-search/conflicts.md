# Conflict Analysis — F-001: Global Search (Cmd+K)

**Analyzed**: 2026-02-27
**Against**: dev branch (commit 3105541)

## Schema Conflicts

| Check | Status | Details |
|-------|--------|---------|
| Prisma models | SAFE | No schema changes needed — search queries existing tables |
| Shared Zod schemas | ADDITIVE | New `search.schema.ts` needed in `packages/shared/src/schemas/` |

No existing search schema exists in `packages/shared/`. A new unified search response schema will be created (ADDITIVE — new file only).

## Route Conflicts

| Check | Status | Details |
|-------|--------|---------|
| Backend routes | SAFE | Existing search endpoints: `GET /api/accounts?search=`, `GET /api/products/search?q=` — no route changes needed |
| New backend route | SAFE | May add `GET /api/search` for unified search — no collision with existing routes in `backend/src/app.ts` |

Existing search infrastructure is sufficient:
- `account-search.service.ts` — pg_trgm similarity search across accounts and contacts
- `product.routes.ts` — `GET /api/products/search` with full-text search
- Option: create a unified `/api/search` endpoint that aggregates, or call multiple endpoints from the frontend

## Component Conflicts

| Check | Status | Details |
|-------|--------|---------|
| cmdk dependency | SAFE | Already installed (v1.1.1) in F-000 |
| Command UI components | SAFE | `frontend/src/components/ui/command.tsx` already exports CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut |
| Layout modification | ADDITIVE | `frontend/src/app/(authenticated)/layout.tsx` needs CommandPalette added |
| TopBar modification | ADDITIVE | `frontend/src/components/layout/top-bar.tsx` needs search trigger button added |
| SearchCombobox | SAFE | Existing `search-combobox.tsx` pattern component — no conflict, different purpose |

## Hook Conflicts

| Check | Status | Details |
|-------|--------|---------|
| Keyboard shortcuts | SAFE | No existing global keyboard handlers — Cmd+K is available |
| useDebounce | SAFE | Already exists, can be reused |
| TanStack Query hooks | SAFE | New `use-global-search.ts` hook — follows established patterns from `use-dashboard.ts` |

## Summary

| Classification | Count | Items |
|---------------|-------|-------|
| SAFE | 9 | All new files, no existing code changes needed |
| ADDITIVE | 3 | New schema file, layout + top-bar modifications (adding imports/components) |
| BREAKING | 0 | None |

**GATE: PASS** — No breaking conflicts. Proceeding to research.

## Files Impacted

### New Files
- `frontend/src/components/search/command-palette.tsx` — main palette component
- `frontend/src/hooks/use-global-search.ts` — TanStack Query search hook
- `packages/shared/src/schemas/search.schema.ts` — unified search response schema

### Modified Files (ADDITIVE only)
- `frontend/src/app/(authenticated)/layout.tsx` — add CommandPalette component
- `frontend/src/components/layout/top-bar.tsx` — add search trigger button
- `packages/shared/src/schemas/index.ts` — export new search schema
