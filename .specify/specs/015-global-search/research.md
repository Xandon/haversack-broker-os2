# Research — F-001: Global Search (Cmd+K)

**Reference Domain**: Accounts (search service) + Dashboard (hooks)
**Analyzed**: 2026-02-27

## Decision 1: Search API Strategy

**Decision**: Call existing backend endpoints separately from the frontend hook (fan-out pattern), rather than creating a new unified `/api/search` backend route.

**Rationale**:
- Account search (`GET /api/accounts?search=`) and product search (`GET /api/products/search?q=`) already exist and are well-tested.
- Creating a unified backend route adds a new backend surface with its own test requirements.
- Fan-out from the frontend via `Promise.allSettled` is simpler, keeps the backend unchanged, and allows independent failure handling per entity type.
- Future optimization: if latency is an issue, a unified endpoint can be added later without frontend changes (just swap the hook internals).

**Alternatives**:
- Unified `/api/search` endpoint — more backend work, single request, but requires creating a new route+service+tests.
- GraphQL-style query — overkill for 3 parallel searches.

## Decision 2: Contact Search Approach

**Decision**: Contacts are searched as part of the account search endpoint (the existing `searchAccounts` function already searches across `contacts.first_name`, `contacts.last_name`, `contacts.email`, `contacts.phone`). A separate contact search API call will query contacts directly.

**Rationale**: The existing account-search.service.ts searches contacts as sub-entities of accounts. For the command palette, we need contacts returned as their own category with their own display format (name + email). We'll need a simple contact search endpoint or reuse the account search with a flag to return matching contacts.

**Decision (refined)**: Create a lightweight `/api/contacts/search?q=` endpoint that returns contacts with their parent account ID and name. This keeps the fan-out pattern clean (3 parallel calls) and avoids overloading the accounts endpoint.

## Decision 3: Command Palette Component Architecture

**Decision**: Create a `CommandPalette` component in `frontend/src/components/search/` that wraps the existing `CommandDialog` from `ui/command.tsx`. The palette manages its own open/closed state and the global keyboard shortcut.

**Rationale**:
- `CommandDialog` (from shadcn/ui command.tsx) already wraps `@radix-ui/react-dialog` + `cmdk` — provides focus trap, ESC handling, and keyboard navigation out of the box.
- A custom wrapper component handles the Cmd+K shortcut, search state, and result rendering.
- Placed in `frontend/src/components/search/` (not `ui/`) because it contains business logic (result categories, navigation URLs).

**Reference pattern**: The `CommandDialog` component is already built at `frontend/src/components/ui/command.tsx` lines 25-35.

## Decision 4: TanStack Query Hook Pattern

**Decision**: Create `useGlobalSearch(query: string)` hook that returns `{ accounts, contacts, products, isLoading, isError }` using multiple `useQuery` calls with the same debounced query.

**Rationale**:
- Follows the established pattern from `use-dashboard.ts` (named export, explicit return type, `apiClient` for fetching).
- Query key format: `['search', 'accounts', debouncedQuery]`, `['search', 'contacts', debouncedQuery]`, `['search', 'products', debouncedQuery]`.
- `enabled: debouncedQuery.length >= 2` prevents requests for short queries.
- Each entity query fails independently — if products search errors, accounts and contacts still show.

**Reference**: `useRepDashboard` at `frontend/src/hooks/use-dashboard.ts` lines 44-54.

## Decision 5: Debounce Implementation

**Decision**: Use a `useDebounce` hook (already exists in codebase) with 300ms delay on the search input value. The debounced value is passed to the TanStack Query hook.

**Rationale**:
- The existing `useDebounce` hook follows the standard pattern.
- 300ms debounce matches AC-032b requirement.
- Debouncing the value (not the function) integrates cleanly with TanStack Query's `queryKey` reactivity.

## Decision 6: Navigation on Result Selection

**Decision**: Use Next.js `useRouter().push()` for navigation when a result is selected. Navigation URLs:
- Accounts: `/accounts/${id}`
- Contacts: `/accounts/${accountId}?tab=contacts`
- Products: `/products/${id}`

**Rationale**: Standard Next.js App Router navigation. Tab parameter for contacts is consistent with the account detail view's tab-based layout (per F-002b spec).

## Decision 7: Search Trigger in TopBar

**Decision**: Add a `SearchTrigger` button component to the TopBar between the mobile menu toggle and the user info section. Shows a search icon + "Search..." text + "⌘K" shortcut hint.

**Rationale**:
- TopBar currently has space between the left (mobile toggle) and right (user info + logout) sections.
- The search trigger goes in the center/left area, making it visually prominent.
- Platform-aware shortcut hint (⌘K vs Ctrl+K) detected via `navigator.platform`.
- On mobile (< 768px), the shortcut hint is hidden but the search icon remains.

**Reference**: `frontend/src/components/layout/top-bar.tsx` — current structure is simple header with flex justify-between.

## Patterns to Follow

### Route/Service Pattern (Backend)
```
GET /api/{entity}/search?q={query}&limit=5
→ Zod validation on query params
→ Service function with tenant_id isolation
→ Returns { data: Entity[] }
```

### TanStack Query Hook Pattern (Frontend)
```typescript
export function useEntitySearch(query: string): ReturnType<typeof useQuery<Entity[]>> {
  return useQuery<Entity[]>({
    queryKey: ['search', 'entity', query],
    queryFn: async () => {
      const response = await apiClient<{ data: Entity[] }>(`/api/entity/search?q=${query}&limit=5`);
      return response.data;
    },
    enabled: query.length >= 2,
  });
}
```

### Component Pattern (Frontend)
```
'use client';
→ Named export
→ Props interface with explicit types
→ cn() for className merging
→ Lucide icons
→ Accessible: aria-labels, roles
```
