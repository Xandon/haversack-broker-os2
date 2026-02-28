# Research — F-002a: Account List & Search

**Generated**: 2026-02-27
**Reference Domain**: accounts (backend) + dashboard hooks (frontend)

## Pattern Decisions

### 1. TanStack Query Hook Pattern

**Decision**: Follow `use-dashboard.ts` pattern — named export, typed response interface, `apiClient<T>` with query keys.
**Rationale**: Consistent with established hooks in the codebase.
**Alternative**: Custom fetch with SWR — rejected, TanStack Query is the standard per CLAUDE.md.

```
Pattern:
- queryKey: ['accounts', { ...filters }] for list queries
- queryKey: ['territories'] for territory dropdown data
- Separate hooks: useAccounts (list), useTerritories (dropdown data)
- Use apiClient<T> from @/lib/api-client
```

### 2. URL Query Parameter Sync

**Decision**: Use Next.js `useSearchParams()` + `useRouter()` to sync filter/sort/pagination state to URL params. Read params on mount to restore state. Update params on filter/sort/page change.
**Rationale**: NFR-016 requires sort state in URL. Next.js App Router provides native search params support.
**Alternative**: React state only (not shareable) — rejected per NFR-016.

### 3. Data Table Integration

**Decision**: Use the existing `DataTable` composite component from `frontend/src/components/patterns/data-table.tsx`. It already supports:
- Column definitions with `ColumnDef<TData, TValue>`
- Manual pagination (`manualPagination: true`) with onNextPage/onPreviousPage callbacks
- Sorting via `SortingState`
- Column visibility via `VisibilityState`
- Loading state
**Rationale**: Reuses F-000 infrastructure. No modifications needed to the composite.

### 4. Server-Side Sorting

**Decision**: Use `manualSorting: true` on the TanStack Table to delegate sorting to the backend. When user clicks a column header, update the `sortBy` and `sortOrder` URL params, which triggers a new API call via TanStack Query.
**Rationale**: Backend already supports sorting (name, healthScore, updatedAt). Client-side sorting would only sort the current page (20 items), giving incorrect results.

### 5. Filter Component Architecture

**Decision**: Create an `AccountFilters` component with:
- Territory dropdown (Select from shadcn/ui)
- Account type dropdown (Select from shadcn/ui)
- Health score preset buttons (ButtonGroup pattern)
- Clear All button
- Search input (Input from shadcn/ui) with debounce via `useDebounce` hook
All filter state managed via URL search params.
**Rationale**: URL-driven state gives shareability and survives refresh.
**Alternative**: React state + useEffect sync — more complex, same result.

### 6. Skeleton Loader Pattern

**Decision**: Render skeleton rows in the table body during loading. Each skeleton row matches the column layout with animated Skeleton components from shadcn/ui.
**Rationale**: CLAUDE.md mandates skeleton loaders, not spinners. Matches F-000's design system patterns.

### 7. Territory Data Fetching

**Decision**: Create `GET /api/territories` backend route returning `{ data: [{ id, name, region }] }` filtered by tenant_id and is_active. Create `useTerritories` hook on frontend. Cache aggressively (staleTime: 5 min) since territory data changes rarely.
**Rationale**: No existing territory endpoint; needed for filter dropdown. Will be reused by orders, commissions, and other features.

## Reference File Map

| Purpose | File | Key Patterns |
|---------|------|-------------|
| Hook structure | `frontend/src/hooks/use-dashboard.ts` | Named exports, apiClient<T>, typed response |
| Debounce | `frontend/src/hooks/use-debounce.ts` | useDebounce(value, delay) |
| API client | `frontend/src/lib/api-client.ts` | apiClient<T>(path, options), auto token refresh |
| Data table | `frontend/src/components/patterns/data-table.tsx` | DataTable<TData, TValue>, ColumnDef, manual pagination |
| Sidebar nav | `frontend/src/components/layout/sidebar.tsx` | /accounts already in NAV_ITEMS |
| Backend route | `backend/src/domains/accounts/account.routes.ts` | GET /api/accounts with accountListQuerySchema |
| Backend service | `backend/src/domains/accounts/account.service.ts` | listAccounts with cursor pagination, total count |
| Shared schema | `packages/shared/src/schemas/account.schema.ts` | accountListQuerySchema (sortBy, filters, cursor) |
| Auth layout | `frontend/src/app/(authenticated)/layout.tsx` | Protected route wrapper with sidebar |
