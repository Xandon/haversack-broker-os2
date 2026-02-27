# Conflict Analysis: Pipeline & Opportunities

## Schema Conflicts

| Item | Classification | Detail |
|------|---------------|--------|
| Opportunity model | SAFE | New model — no existing Opportunity model in schema |
| OpportunityBrand model | SAFE | New join table — no existing model |
| Account relation | ADDITIVE | Add `opportunities Opportunity[]` relation to existing Account model |
| Brand relation | ADDITIVE | Add `opportunityBrands OpportunityBrand[]` relation to existing Brand model |
| User relation | ADDITIVE | Add `opportunities Opportunity[]` relation to existing User model |
| ActivityType enum | SAFE | Stage-change logged as type "note" — no enum change needed |
| PipelineStage enum | SAFE | New enum, no existing pipeline-related enums |

## Route Conflicts

| Route Prefix | Classification | Detail |
|--------------|---------------|--------|
| /api/opportunities/* | SAFE | No existing routes under this prefix |
| /api/pipeline/* | SAFE | No existing routes under this prefix |

## Shared Schema Conflicts

| File | Classification | Detail |
|------|---------------|--------|
| opportunity.schema.ts | SAFE | New file — does not exist |
| pipeline.schema.ts | SAFE | New file — does not exist |

## App Registration

| File | Classification | Detail |
|------|---------------|--------|
| backend/src/app.ts | ADDITIVE | Add opportunityRoutes import + registration |

## Integration Points

| Service | Classification | Detail |
|---------|---------------|--------|
| Activity service | ADDITIVE | Call createActivity() for stage-change logging (type "note") |
| Audit service | SAFE | Uses existing writeAuditLog() — no changes needed |
| Auth/RBAC middleware | SAFE | Uses existing authenticate + authorize middleware |

## Summary

- **SAFE:** 10 items (new files/models only)
- **ADDITIVE:** 4 items (existing files modified by adding relations/imports/routes)
- **BREAKING:** 0 items

**Gate: PASS — no breaking changes detected.**
