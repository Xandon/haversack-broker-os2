# Tasks: Account Forms and Contacts (F-002c)

**Input**: Design documents from `/specs/018-account-forms/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Global batch counter start**: 49
**Task ID start**: T335

## Batch 49: Account Create Form (US-1)

**Goal**: Deliver /accounts/new page with full form, duplicate detection, and territory-scoped dropdown
**Visual**: Rep can navigate to /accounts/new, fill in fields, see duplicate warnings, and create an account
**Depends on**: None (all backend APIs exist)
**Branch**: `feature/batch-49-account-create-form`

### Hooks

- [ ] T335 [P] [US1] Create `useCreateAccount` mutation hook in `frontend/src/hooks/use-create-account.ts` — wraps POST /api/accounts, invalidates `['accounts']` on success. Include types for response. (NEW)
- [ ] T336 [P] [US1] Create `useCheckDuplicates` lazy query hook in `frontend/src/hooks/use-check-duplicates.ts` — wraps GET /api/accounts/check-duplicates, accepts name param, manually triggered (not auto-fetch). Include `DuplicateMatch` type. (NEW)
- [ ] T337 [P] [US1] Write tests for `useCreateAccount` in `frontend/src/hooks/use-create-account.test.ts` — test mutation call, cache invalidation, error handling. (NEW)
- [ ] T338 [P] [US1] Write tests for `useCheckDuplicates` in `frontend/src/hooks/use-check-duplicates.test.ts` — test query trigger, response parsing, disabled by default. (NEW)

### Components

- [ ] T339 [US1] Create `DuplicateWarningDialog` component in `frontend/src/components/accounts/duplicate-warning-dialog.tsx` — shows duplicate matches with name, territory, confidence, "View Existing" link, and "Create Anyway" button. (NEW, depends on T336)
- [ ] T340 [US1] Create `AccountForm` component in `frontend/src/components/accounts/account-form.tsx` — React Hook Form + Zod, mode prop (create/edit), fields: name, accountType select, address (street, city, state, zip), territory select (role-scoped), parentAccountId (optional), inline primaryContact section (create mode only). Name blur triggers duplicate check. (NEW, depends on T335, T336, T339)
- [ ] T341 [P] [US1] Write tests for `DuplicateWarningDialog` in `frontend/src/components/accounts/duplicate-warning-dialog.test.tsx` — test render with matches, "View Existing" navigation, "Create Anyway" callback. (NEW)
- [ ] T342 [US1] Write tests for `AccountForm` in `frontend/src/components/accounts/account-form.test.tsx` — test create mode rendering, validation errors, form submission, duplicate check on name blur, territory filtering by role. (NEW, depends on T340)

### Pages

- [ ] T343 [US1] Create `/accounts/new/page.tsx` — renders AccountForm in create mode with PageHeader breadcrumb. On success, redirect to /accounts/[id]. (NEW, depends on T340)
- [ ] T344 [P] [US1] Create `/accounts/new/loading.tsx` — skeleton loader matching form layout. (NEW)
- [ ] T345 [US1] Add "New Account" button to accounts list page in `frontend/src/app/(authenticated)/accounts/page.tsx` — link to /accounts/new in the page header area. (MOD)

**Checkpoint**: Rep can create a new account via /accounts/new with duplicate detection and territory scoping.

---

## Batch 50: Account Edit Form (US-2)

**Goal**: Deliver /accounts/[id]/edit page with pre-populated form and update functionality
**Visual**: Rep can click "Edit" on account detail, see pre-populated form, modify fields, and save
**Depends on**: Batch 49 (reuses AccountForm component)
**Branch**: `feature/batch-50-account-edit-form`

### Pages

- [ ] T346 [US2] Create `/accounts/[id]/edit/page.tsx` — fetches account via `useAccountDetail`, renders AccountForm in edit mode with pre-populated data. On success, redirect to /accounts/[id]. On cancel, navigate back. Error/not-found states. (NEW, depends on T340)
- [ ] T347 [P] [US2] Create `/accounts/[id]/edit/loading.tsx` — skeleton loader matching form layout. (NEW)

### Tests

- [ ] T348 [US2] Write tests for edit page behavior — verify form pre-population, update submission, cancel navigation, error states. (NEW, depends on T346)

**Checkpoint**: Rep can edit an existing account via /accounts/[id]/edit with pre-populated form.

---

## Dependencies & Execution Order

### Batch Dependencies

- **Batch 49**: No dependencies — can start immediately
- **Batch 50**: Depends on Batch 49 (reuses AccountForm component)

### Within Batch 49

```
T335, T336, T337, T338 — all parallel (hooks + tests)
T339 — depends on T336 (uses DuplicateMatch type)
T341 — parallel with T339 (test skeleton)
T340 — depends on T335, T336, T339 (form uses all hooks + dialog)
T342 — depends on T340 (tests the form)
T343 — depends on T340 (page renders form)
T344 — parallel (skeleton, no deps)
T345 — parallel (button addition, no deps)
```

### Within Batch 50

```
T346 — depends on Batch 49 T340 (reuses AccountForm)
T347 — parallel (skeleton, no deps)
T348 — depends on T346 (tests the page)
```

### Parallel Opportunities

- T335, T336, T337, T338 can all run in parallel
- T341, T344, T345 can run in parallel
- T347 can run in parallel with T346
