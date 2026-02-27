# Implementation Plan: Pipeline & Opportunities

## File Structure

### New Files (14)

| # | File | Workspace | Description |
|---|------|-----------|-------------|
| 1 | `packages/shared/src/schemas/opportunity.schema.ts` | shared | Zod schemas: pipelineStage, create/update/transition opportunity, list query, pipeline summary query, win/loss query, response schemas |
| 2 | `backend/src/domains/opportunities/opportunity.service.ts` | backend | Core CRUD: create, getById, update, list, softDelete, transition stage |
| 3 | `backend/src/domains/opportunities/opportunity.service.test.ts` | backend | Unit tests for opportunity service |
| 4 | `backend/src/domains/opportunities/pipeline.service.ts` | backend | Pipeline summary: grouped by stage, weighted forecast calculation |
| 5 | `backend/src/domains/opportunities/pipeline.service.test.ts` | backend | Unit tests for pipeline service |
| 6 | `backend/src/domains/opportunities/analytics.service.ts` | backend | Win/loss analytics: win rate, avg deal size, avg cycle, top close reasons |
| 7 | `backend/src/domains/opportunities/analytics.service.test.ts` | backend | Unit tests for analytics service |
| 8 | `backend/src/domains/opportunities/opportunity.routes.ts` | backend | Fastify routes: CRUD + transition + pipeline + analytics |
| 9 | `backend/src/domains/opportunities/opportunity.routes.test.ts` | backend | Route integration tests |
| 10 | `backend/src/domains/opportunities/index.ts` | backend | Barrel exports |
| 11 | `backend/src/domains/opportunities/stage-defaults.ts` | backend | Pipeline stage → probability mapping constant |
| 12 | `.specify/specs/007-pipeline-opportunities/data-model.md` | spec | Entity definitions and relationships |
| 13 | `.specify/specs/007-pipeline-opportunities/contracts/opportunity-api.md` | spec | API endpoint contracts |
| 14 | `.specify/specs/007-pipeline-opportunities/quickstart.md` | spec | Key validation scenarios |

### Modified Files (5)

| # | File | Workspace | Change |
|---|------|-----------|--------|
| 1 | `prisma/schema.prisma` | backend | Add PipelineStage enum, Opportunity model, OpportunityBrand model, relations on Account/Brand/User |
| 2 | `backend/src/app.ts` | backend | Import and register opportunityRoutes |
| 3 | `packages/shared/src/index.ts` | shared | Export opportunity schema types |
| 4 | `packages/shared/src/constants/index.ts` | shared | Add opportunity-related ERROR_CODES |
| 5 | `backend/src/shared/test-helpers/db.ts` | backend | Add opportunity/opportunityBrand mock to MockPrismaClient |

## Data Model

### PipelineStage (Prisma enum)
```
prospect, qualified, proposal, negotiation, closed_won, closed_lost
```

### Opportunity Model
```
id              UUID PK (gen_random_uuid)
tenantId        UUID FK → implicit RLS
accountId       UUID FK → Account
repId           UUID FK → User
name            VARCHAR(255) NOT NULL
estimatedValue  DECIMAL(12,2) NOT NULL
probability     DECIMAL(5,2) NOT NULL (0-100)
expectedCloseDate DATE NOT NULL
stage           PipelineStage NOT NULL
closeReason     TEXT (null for open, required for closed)
closedAt        TIMESTAMPTZ (auto-set on close)
isActive        BOOLEAN DEFAULT true
createdAt       TIMESTAMPTZ DEFAULT now()
updatedAt       TIMESTAMPTZ @updatedAt

Relations:
  account       Account
  rep           User
  brands        OpportunityBrand[]

Indexes:
  @@index([tenantId, stage])
  @@index([tenantId, repId])
  @@index([tenantId, accountId])
  @@index([tenantId, expectedCloseDate])
  @@map("opportunities")
```

### OpportunityBrand Model
```
id              UUID PK (gen_random_uuid)
opportunityId   UUID FK → Opportunity
brandId         UUID FK → Brand

@@unique([opportunityId, brandId])
@@map("opportunity_brands")
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/opportunities | rep, manager | Create opportunity |
| GET | /api/opportunities | all authenticated | List opportunities (filtered, paginated) |
| GET | /api/opportunities/:id | all authenticated | Get opportunity detail |
| PUT | /api/opportunities/:id | rep (own), manager | Update opportunity fields |
| DELETE | /api/opportunities/:id | rep (own), manager | Soft-delete opportunity |
| POST | /api/opportunities/:id/transition | rep (own), manager | Stage transition with validation |
| GET | /api/pipeline/summary | all authenticated | Pipeline grouped by stage + forecast |
| GET | /api/pipeline/analytics | rep, manager | Win/loss analytics |

## Stage Defaults

```typescript
const STAGE_DEFAULTS: Record<PipelineStage, number> = {
  prospect: 10,
  qualified: 40,
  proposal: 60,
  negotiation: 75,
  closed_won: 100,
  closed_lost: 0,
};
```
