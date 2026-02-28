# Implementation Plan: Task Management

**Branch**: `017-task-management` | **Date**: 2026-02-28 | **Spec**: `.specify/specs/017-task-management/spec.md`

## Summary

Build the /tasks frontend page with a filterable data table, task creation/editing via dialog forms, and a quick status toggle. The backend (CRUD endpoints, Zod schemas, service layer) is already complete — this is a frontend-only feature consuming existing APIs.

## Technical Context

**Language/Version**: TypeScript 5.4+ (strict mode)
**Primary Dependencies**: React 18, Next.js 14 (App Router), TanStack Query v5, React Hook Form + Zod, shadcn/ui, TanStack Table
**Storage**: N/A (frontend consumes existing REST API)
**Testing**: Vitest + @testing-library/react
**Target Platform**: Web (desktop + mobile responsive, 320-1440px)
**Project Type**: Web application (frontend page)
**Performance Goals**: FCP <2s on 4G, API p95 <200ms
**Constraints**: Must follow existing patterns from activities/accounts pages

## Project Structure

### Source Code

```text
frontend/src/
├── app/(authenticated)/
│   └── tasks/
│       └── page.tsx                    # NEW — Tasks list page
├── components/tasks/
│   ├── task-columns.tsx                # NEW — DataTable column definitions
│   ├── task-columns.test.tsx           # NEW — Column tests
│   ├── task-filter-bar.tsx             # NEW — Status/priority/overdue filters
│   ├── task-filter-bar.test.tsx        # NEW — Filter bar tests
│   ├── task-form-dialog.tsx            # NEW — Create/edit task dialog
│   ├── task-form-dialog.test.tsx       # NEW — Form dialog tests
│   ├── tasks-page.test.tsx             # NEW — Page-level tests
│   └── task-status-toggle.tsx          # NEW — Quick complete checkbox
│   └── task-status-toggle.test.tsx     # NEW — Toggle tests
├── hooks/
│   ├── use-tasks.ts                    # NEW — useTasks, useCreateTask, useUpdateTask hooks
│   └── use-tasks.test.ts              # NEW — Hook tests
└── components/layout/
    └── sidebar.tsx                     # MODIFIED — Add /tasks nav link
```

### File Details

| File | Status | Workspace | Description |
|------|--------|-----------|-------------|
| `frontend/src/hooks/use-tasks.ts` | NEW | frontend | TanStack Query hooks for task CRUD |
| `frontend/src/hooks/use-tasks.test.ts` | NEW | frontend | Hook tests (6 tests) |
| `frontend/src/components/tasks/task-columns.tsx` | NEW | frontend | 6 column definitions (toggle, title, status, priority, due date, overdue) |
| `frontend/src/components/tasks/task-columns.test.tsx` | NEW | frontend | Column tests (6 tests) |
| `frontend/src/components/tasks/task-filter-bar.tsx` | NEW | frontend | Filter bar with status, priority, overdue dropdowns |
| `frontend/src/components/tasks/task-filter-bar.test.tsx` | NEW | frontend | Filter tests (5 tests) |
| `frontend/src/components/tasks/task-form-dialog.tsx` | NEW | frontend | RHF+Zod dialog for create/edit |
| `frontend/src/components/tasks/task-form-dialog.test.tsx` | NEW | frontend | Form dialog tests (7 tests) |
| `frontend/src/components/tasks/task-status-toggle.tsx` | NEW | frontend | Checkbox for quick complete |
| `frontend/src/components/tasks/task-status-toggle.test.tsx` | NEW | frontend | Toggle tests (3 tests) |
| `frontend/src/app/(authenticated)/tasks/page.tsx` | NEW | frontend | Tasks list page |
| `frontend/src/components/tasks/tasks-page.test.tsx` | NEW | frontend | Page tests (5 tests) |
| `frontend/src/components/layout/sidebar.tsx` | MODIFIED | frontend | Add Tasks nav link with CheckSquare icon |

### MODIFIED File Details

**`frontend/src/components/layout/sidebar.tsx`**:
- Add import for `CheckSquare` icon from lucide-react
- Add `{ href: '/tasks', label: 'Tasks', icon: CheckSquare }` to navigation items array
