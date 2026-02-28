# Research: Account Forms and Contacts (F-002c)

**Feature**: 018-account-forms
**Date**: 2026-02-28
**Reference Domain**: accounts (backend + frontend)

## Reference Patterns

### 1. Route Structure (Backend — already complete)

**File**: `backend/src/domains/accounts/account.routes.ts`

The backend already implements all endpoints needed for F-002c:
- `POST /api/accounts` — creates account with inline primary contact, duplicate gate
- `PUT /api/accounts/:id` — updates account with optimistic concurrency
- `GET /api/accounts/check-duplicates` — Levenshtein-based duplicate detection
- `GET /api/territories` — list all territories

**Decision**: No backend work needed. All API contracts are stable and tested.

### 2. TanStack Query Hook Patterns

**Reference**: `frontend/src/hooks/use-account-detail.ts`

Pattern for mutations:
```typescript
export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ accountId, input }) => {
      return apiClient(`/api/accounts/${accountId}`, { method: 'PUT', body: JSON.stringify(input) });
    },
    onSuccess: (_data, { accountId }) => {
      void queryClient.invalidateQueries({ queryKey: ['accounts', accountId] });
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
```

**Decision**: Follow this pattern for `useCreateAccount`. Query key invalidation should invalidate `['accounts']` list cache.

**Reference**: `frontend/src/hooks/use-territories.ts`

Already implemented with 5-minute stale time. Will be used directly in the form.

### 3. React Hook Form + Zod Patterns

**Reference**: `frontend/src/components/accounts/contacts-tab.tsx` (ContactFormDialog)

Pattern:
```typescript
const { register, handleSubmit, reset, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
  defaultValues: { ... },
});
```

**Decision**: Follow this exact pattern for AccountForm. Use `zodResolver` with the shared schemas from `@haversack/shared`.

### 4. Shared Schema Patterns

**Reference**: `packages/shared/src/schemas/account.schema.ts`

Schemas already exist:
- `createAccountSchema` — includes `primaryContact` inline schema
- `updateAccountSchema` — all fields optional
- `duplicateCheckQuerySchema` — name (required), phone, streetAddress (optional)

**Decision**: Use shared schemas directly. No schema modifications needed.

### 5. UI Component Patterns

**Reference**: Activity form (batch 46), Task form dialog (batch 48)

Form pages follow the pattern:
- Page header with breadcrumb and title
- Card-wrapped form sections
- Validation errors inline below fields
- Submit/Cancel buttons in a sticky footer or card footer
- Success toast + redirect on save

**Decision**: Follow the same structure. Use `PageHeader` breadcrumb, Card sections for form grouping.

### 6. Navigation Pattern

**Reference**: `frontend/src/components/accounts/account-detail-header.tsx`

The "Edit" button already links to `/accounts/${account.id}/edit`:
```typescript
<Link href={`/accounts/${account.id}/edit`}>Edit</Link>
```

The "New Order" button links to `/orders/new?accountId=${account.id}`.

**Decision**: Account list page should also have a "New Account" button linking to `/accounts/new`.

## Architectural Decisions

| Decision | Rationale | Alternative Rejected |
|----------|-----------|---------------------|
| Single AccountForm component for create and edit | Reduces duplication; form fields are identical, only submit behavior differs | Separate CreateAccountForm and EditAccountForm — too much code duplication |
| Client-side territory filtering for Rep role | Territories list is small (<20), already fetched. Avoids new backend endpoint | Server-side filtering — unnecessary complexity for small dataset |
| Duplicate check as separate hook with manual trigger | Only fires on blur, not continuous. Keeps form snappy | Auto-query on name change — too many API calls |
| Parent account as simple select (not search combobox) | Small number of accounts per territory. Search combobox is overkill for MVP | Full search combobox — adds complexity, can be enhanced later |
