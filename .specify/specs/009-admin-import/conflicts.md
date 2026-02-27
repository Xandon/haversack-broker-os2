# Conflict Analysis: Admin & Data Import

**Feature:** 009-admin-import
**Analyzed:** 2026-02-27

## Summary

| Area | Classification | Impact |
|------|---------------|--------|
| Prisma Schema | ADDITIVE | Add 2 models (DataImport, DataQualityScore) + 2 enums |
| Auth Routes | SAFE | No changes needed |
| App.ts | ADDITIVE | Register 1 new route module (userRoutes + adminRoutes) |
| Shared Schemas | ADDITIVE | Add new admin.schema.ts |
| Worker Index | ADDITIVE | Add 2 new queues (data-import, data-quality-score) |
| User Model | SAFE | Already has all required fields |
| Authorization Middleware | SAFE | Already supports admin role bypass |

**BREAKING CHANGES: NONE**

## Details

### Prisma Schema (ADDITIVE)
- User model already complete with: email, passwordHash, role (UserRole enum), isActive, territory relationships
- Need to ADD: DataImport model, DataQualityScore model, DataImportStatus enum, DataImportEntityType enum
- No modifications to existing models

### App.ts Route Registration (ADDITIVE)
- Current: 10 route modules registered
- Need: 1 import + 1 registration for admin/user routes
- No conflict with existing route prefixes

### Shared Schemas (ADDITIVE)
- user.schema.ts exists with response schema only
- Need: new admin.schema.ts for user management, import, and quality schemas
- No breaking changes to existing exports

### Worker (ADDITIVE)
- 7 existing queues, all following consistent pattern
- Need: 2 new queues (data-import at trigger, data-quality-score at 03:00 UTC cron)
- Data quality runs after health score (02:00 UTC) — no timing conflict

## Risk Assessment

- LOW: User model complete, auth middleware ready, RBAC pattern established
- MEDIUM: File upload handling (50 MB), import batch transaction safety, queue timing
