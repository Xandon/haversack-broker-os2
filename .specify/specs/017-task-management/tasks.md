# Task Breakdown — Task Management (FR-037)

**Global Batch Counter**: starts at 47
**Task IDs**: T325-T336

## Batch 47: Task List Page (US-1: View and Filter Tasks)

**Branch**: `feature/batch-47-task-list-page`
**Delivers**: /tasks page with data table, filters, overdue indicators
**Visual**: Navigable /tasks page showing filtered task list with status/priority badges and overdue highlighting

| Task | Description | Files | Status | Deps |
|------|-------------|-------|--------|------|
| T325 | Create `useTasks` hook (list with filters, cursor pagination) and `useCreateTask` + `useUpdateTask` mutations | `frontend/src/hooks/use-tasks.ts` (NEW), `frontend/src/hooks/use-tasks.test.ts` (NEW) | [x] | — |
| T326 | Create task column definitions (toggle, title, status badge, priority badge, due date, overdue indicator) | `frontend/src/components/tasks/task-columns.tsx` (NEW), `frontend/src/components/tasks/task-columns.test.tsx` (NEW) | [x] | T325 |
| T327 | Create task filter bar (status, priority, overdue dropdowns) | `frontend/src/components/tasks/task-filter-bar.tsx` (NEW), `frontend/src/components/tasks/task-filter-bar.test.tsx` (NEW) | [x] | — [P] |
| T328 | Create /tasks page with DataTable, filter bar, empty state, error state, skeleton loader | `frontend/src/app/(authenticated)/tasks/page.tsx` (NEW), `frontend/src/components/tasks/tasks-page.test.tsx` (NEW) | [x] | T325, T326, T327 |
| T329 | Add Tasks nav link to sidebar | `frontend/src/components/layout/sidebar.tsx` (MOD) | [x] | — [P] |

## Batch 48: Task Form Dialog + Quick Status Toggle (US-2 + US-3)

**Branch**: `feature/batch-48-task-form-toggle`
**Delivers**: Create/edit task dialog, inline status toggle for quick complete
**Visual**: Full task CRUD with quick-complete checkbox toggle on each row

| Task | Description | Files | Status | Deps |
|------|-------------|-------|--------|------|
| T330 | Create TaskFormDialog (RHF+Zod, title, description, due date, priority, account selector) | `frontend/src/components/tasks/task-form-dialog.tsx` (NEW), `frontend/src/components/tasks/task-form-dialog.test.tsx` (NEW) | [x] | T325 |
| T331 | Create TaskStatusToggle (checkbox component for quick complete/uncomplete) | `frontend/src/components/tasks/task-status-toggle.tsx` (NEW), `frontend/src/components/tasks/task-status-toggle.test.tsx` (NEW) | [x] | T325 |
| T332 | Wire TaskFormDialog into page (New Task button, row click to edit, dialog open/close) | `frontend/src/app/(authenticated)/tasks/page.tsx` (MOD) | [x] | T328, T330 |
| T333 | Wire TaskStatusToggle into task-columns (add toggle column, connect to useUpdateTask) | `frontend/src/components/tasks/task-columns.tsx` (MOD) | [x] | T326, T331 |
| T334 | Add overdue row highlighting CSS (red left border or background tint for overdue rows) | `frontend/src/app/(authenticated)/tasks/page.tsx` (MOD) | [x] | T328 |

## Dependency Graph

```
T325 (hooks) ──┬── T326 (columns) ──┬── T328 (page) ──── T332 (wire dialog)
               │                    │                 ├── T334 (overdue CSS)
               │                    └── T333 (wire toggle)
               └── T330 (form dialog)
               └── T331 (status toggle)

T327 (filters) ──── T328 (page)
T329 (sidebar) ──── (independent)
```

## Priority Mapping

- **P1**: T325, T326, T327, T328, T329, T330, T332 (core list + create)
- **P2**: T331, T333, T334 (quick toggle + overdue highlighting)
