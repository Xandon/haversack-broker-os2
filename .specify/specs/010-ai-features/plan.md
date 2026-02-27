# Implementation Plan: AI Features

**Branch**: `010-ai-features` | **Date**: 2026-02-27 | **Spec**: `specs/010-ai-features/spec.md`
**Input**: Feature specification from `/specs/010-ai-features/spec.md`

## Summary

Implement an AI provider abstraction layer (Anthropic Claude primary, OpenAI fallback) and three LLM-powered features: meeting briefs, email drafts, and activity summaries. The provider layer lives in `backend/src/shared/ai/` as cross-domain infrastructure. Domain services in `backend/src/domains/ai/` aggregate data from existing models and call the provider. All AI content is labeled, editable, and rate-limited. No Prisma schema changes required.

## Technical Context

**Language/Version**: TypeScript 5.4+ (strict mode), Node.js 20 LTS
**Primary Dependencies**: @anthropic-ai/sdk, openai, Fastify 4+, Zod, Pino
**Storage**: PostgreSQL 16+ (read-only access to existing models via Prisma)
**Testing**: Vitest (mock AI SDKs at integration boundary)
**Target Platform**: Docker container (backend)
**Performance Goals**: 3s p95 for AI responses (NFR-005)
**Constraints**: 5s per-provider timeout, 10s total timeout, 10 req/min/user rate limit
**Scale/Scope**: 3 AI endpoints + 1 provider abstraction layer

## File Structure

### New Files (15)

| # | File Path | Workspace | Description |
|---|-----------|-----------|-------------|
| 1 | `backend/src/shared/ai/types.ts` | backend | AI provider types and interfaces |
| 2 | `backend/src/shared/ai/ai-provider.ts` | backend | Provider interface + factory function |
| 3 | `backend/src/shared/ai/anthropic-provider.ts` | backend | Anthropic Claude SDK implementation |
| 4 | `backend/src/shared/ai/openai-provider.ts` | backend | OpenAI SDK implementation |
| 5 | `backend/src/shared/ai/ai-client.ts` | backend | Orchestrator with failover, timeout, and audit logging |
| 6 | `backend/src/shared/ai/prompts.ts` | backend | Prompt templates for all AI features |
| 7 | `backend/src/shared/ai/ai-client.test.ts` | backend | Tests for failover, timeout, and orchestration |
| 8 | `backend/src/domains/ai/meeting-brief.service.ts` | backend | Meeting brief data aggregation + AI call |
| 9 | `backend/src/domains/ai/email-draft.service.ts` | backend | Email draft data aggregation + AI call |
| 10 | `backend/src/domains/ai/activity-summary.service.ts` | backend | Activity summary data aggregation + AI call |
| 11 | `backend/src/domains/ai/ai.routes.ts` | backend | Fastify routes for all 3 AI endpoints |
| 12 | `backend/src/domains/ai/meeting-brief.service.test.ts` | backend | Tests for meeting brief service |
| 13 | `backend/src/domains/ai/email-draft.service.test.ts` | backend | Tests for email draft service |
| 14 | `backend/src/domains/ai/activity-summary.service.test.ts` | backend | Tests for activity summary service |
| 15 | `packages/shared/src/schemas/ai.schema.ts` | shared | Zod schemas for AI request/response validation |

### Modified Files (3)

| # | File Path | Workspace | Changes |
|---|-----------|-----------|---------|
| 1 | `backend/src/app.ts` | backend | Add import for `aiRoutes`, register route |
| 2 | `packages/shared/src/index.ts` | shared | Add export for `ai.schema` |
| 3 | `backend/package.json` | backend | Add `@anthropic-ai/sdk` and `openai` dependencies |

**Total: 15 new, 3 modified = 18 files**

## Data Model

No new Prisma models. All AI features read from existing models:

### Read-Only Access

- **Account**: name, healthScore, territory
- **Contact**: name, title, email, isPrimary, lastInteractionDate
- **Activity**: type, subject, notes, createdAt, accountId
- **Order**: status, total, lineItems, createdAt, accountId
- **OrderLineItem**: product, quantity, unitPrice
- **Product**: name, sku, certifications, unitPrice
- **Brand**: name
- **AccountHealthScore**: overallScore, calculatedAt

### Audit Logging

AI requests are logged via the existing `writeAuditLog` function:
- `entityType: 'ai_request'`
- `action: 'ai_meeting_brief' | 'ai_email_draft' | 'ai_activity_summary'`
- `newValue`: JSON with provider, responseTimeMs, tokenCount, success

## API Contracts

### POST /api/ai/meeting-brief

**Auth**: `rep`, `manager`, `admin`
**Rate Limit**: 10 req/min/user
**Request**: `{ account_id: string (uuid) }`
**Response 200**: `{ data: { account_id, account_name, ai_generated: true, ai_label: "AI-Generated", brief: { key_contacts, activity_summary, order_trends, talking_points, health_score, health_trend }, editable: true, generated_at } }`
**Response 503**: `{ error: "AI_SERVICE_UNAVAILABLE", message: "AI service temporarily unavailable — please try again in a few minutes", code: "AI_UNAVAILABLE", requestId }`

### POST /api/ai/email-draft

**Auth**: `rep`, `manager`, `admin`
**Rate Limit**: 15 req/min/user
**Request**: `{ account_id: string (uuid), contact_id: string (uuid), purpose: enum, context?: string, product_ids?: string[], tone?: enum }`
**Response 200**: `{ data: { ai_generated: true, ai_label: "AI-Generated", draft: { to_email, to_name, subject, body, suggested_send_time }, editable: true, generated_at } }`
**Response 400**: Contact has no email
**Response 503**: AI unavailable

### POST /api/ai/activity-summary

**Auth**: `rep`, `manager`, `admin`
**Rate Limit**: 10 req/min/user
**Request**: `{ account_id: string (uuid), period_months?: number (1-24, default 6) }`
**Response 200**: `{ data: { account_id, account_name, ai_generated: true, ai_label: "AI-Generated", summary: { period, total_activities, activity_breakdown, narrative, key_events, engagement_assessment }, editable: true, generated_at } }`
**Response 503**: AI unavailable

## Quickstart Validation Scenarios

1. **Provider failover**: Mock Anthropic timeout → verify OpenAI fallback → verify response within 10s
2. **Both providers down**: Mock both providers failing → verify 503 response with correct error message
3. **Meeting brief happy path**: Seed account with activities + orders → request brief → verify structured response with all sections
4. **Email draft with products**: Seed contact + products → request draft with product_ids → verify products mentioned in body
5. **Activity summary empty**: Request summary for account with no activities → verify "No recorded activities" response
6. **Rate limiting**: Send 11 requests in 1 minute → verify 429 on 11th request
7. **RBAC enforcement**: Request AI endpoint as `viewer` role → verify 403
8. **Tenant isolation**: Request meeting brief for account in different tenant → verify 404
