# Tasks: AI Features

**Feature**: AI Features (010-ai-features)
**Spec**: `specs/010-ai-features/spec.md`
**Tasks**: T182-T199 (18 tasks)
**Batches**: 3 (batches 25-27)

## Dependencies

- Feature 1 (Foundation): Auth, RBAC, audit — COMPLETE
- Feature 2 (Account Management): Account, Contact, HealthScore models — COMPLETE
- Feature 3 (Activity & Tasks): Activity model — COMPLETE
- Feature 4 (Order Entry): Order, OrderLineItem, Product, Brand models — COMPLETE

## Batch 25: AI Provider Layer & Shared Schemas (T182-T187)

**Branch**: `feature/batch-batch-25-ai-provider`
**Focus**: Foundation infrastructure — provider abstraction, SDK integration, failover, shared schemas

### T182: Create AI Zod schemas in shared package
- **US**: US-1 (AI Provider Abstraction Layer) | **Refs**: FR-AI-006, FR-AI-008
- **Files**: `packages/shared/src/schemas/ai.schema.ts` (NEW), `packages/shared/src/index.ts` (MOD)
- **Workspace**: shared
- **Dependencies**: None
- **Description**: Create Zod schemas for all AI request/response types: meetingBriefRequestSchema, meetingBriefResponseSchema, emailDraftRequestSchema, emailDraftResponseSchema, activitySummaryRequestSchema, activitySummaryResponseSchema. Include AI error codes (AI_SERVICE_UNAVAILABLE, AI_RATE_LIMITED, CONTACT_NO_EMAIL). Export from index.ts barrel.

### T183: Create AI provider types and interface
- **US**: US-1 (AI Provider Abstraction Layer) | **Refs**: FR-AI-001
- **Files**: `backend/src/shared/ai/types.ts` (NEW), `backend/src/shared/ai/ai-provider.ts` (NEW)
- **Workspace**: backend
- **Dependencies**: None [P — parallel with T182]
- **Description**: Define AIProvider interface with `generateCompletion(prompt: string, options: AIRequestOptions): Promise<AICompletionResult>`. Define types: AIRequestOptions (maxTokens, temperature, systemPrompt), AICompletionResult (content, inputTokens, outputTokens, provider, responseTimeMs). Define AIProviderConfig with apiKey, model, timeoutMs. Create provider factory function.

### T184: Implement Anthropic provider
- **US**: US-1 (AI Provider Abstraction Layer) | **Refs**: FR-AI-001, FR-AI-002
- **Files**: `backend/src/shared/ai/anthropic-provider.ts` (NEW)
- **Workspace**: backend
- **Dependencies**: T183
- **Description**: Implement AnthropicProvider class using `@anthropic-ai/sdk`. Constructor takes APIKey + model (default claude-sonnet-4-6). Implement generateCompletion with 5-second per-provider timeout via AbortController. Handle HTTP 5xx, 429, and timeout errors by throwing typed errors. Return token counts from response metadata. Add `@anthropic-ai/sdk` to backend/package.json.

### T185: Implement OpenAI provider
- **US**: US-1 (AI Provider Abstraction Layer) | **Refs**: FR-AI-001, FR-AI-002
- **Files**: `backend/src/shared/ai/openai-provider.ts` (NEW)
- **Workspace**: backend
- **Dependencies**: T183
- **Description**: Implement OpenAIProvider class using `openai` SDK. Constructor takes APIKey + model (default gpt-4o-mini). Same interface as Anthropic. 5-second timeout. Handle errors. Return token counts. Add `openai` to backend/package.json. [P — parallel with T184]

### T186: Implement AI client orchestrator with failover
- **US**: US-1 (AI Provider Abstraction Layer) | **Refs**: FR-AI-001, FR-AI-002, FR-AI-007, FR-AI-009
- **Files**: `backend/src/shared/ai/ai-client.ts` (NEW), `backend/src/shared/ai/ai-client.test.ts` (NEW)
- **Workspace**: backend
- **Dependencies**: T184, T185
- **Description**: Create AIClient class that takes primary (Anthropic) and fallback (OpenAI) providers. Implement `generate(prompt, options)` with: try primary → on failure, try fallback → on both failure, throw AIError('AI_SERVICE_UNAVAILABLE'). Enforce 10-second total timeout via AbortController. Log each attempt via Pino structured logger (provider, responseTimeMs, success, tokenCount). Return AICompletionResult with provider metadata. Tests: mock both providers, verify failover logic, verify timeout enforcement, verify structured logging.

### T187: Create AI prompt templates
- **US**: US-2, US-3, US-4 | **Refs**: FR-AI-003, FR-AI-004, FR-AI-005
- **Files**: `backend/src/shared/ai/prompts.ts` (NEW)
- **Workspace**: backend
- **Dependencies**: None [P — parallel with T186]
- **Description**: Create prompt template functions: buildMeetingBriefPrompt(accountData), buildEmailDraftPrompt(contactData, purpose, context), buildActivitySummaryPrompt(activityData, period). Each returns a system prompt + user prompt pair. Prompts instruct the LLM to return valid JSON matching the expected response schemas. Include instructions for structured output, AI labeling, and content quality.

---

## Batch 26: Meeting Brief & Email Draft Services (T188-T193)

**Branch**: `feature/batch-batch-26-ai-meeting-email`
**Focus**: Core AI features — meeting brief and email draft services + routes

### T188: Implement meeting brief data aggregation service
- **US**: US-2 (Meeting Preparation Brief) | **Refs**: FR-AI-003, FR-030, AC-030a
- **Files**: `backend/src/domains/ai/meeting-brief.service.ts` (NEW)
- **Workspace**: backend
- **Dependencies**: T186, T187
- **Description**: Create `generateMeetingBrief(prisma, aiClient, tenantId, accountId)`. Query: account + contacts (top 5 by interaction), activities (last 50 within 12 months), orders (last 12 months with line items), health score. Format data into prompt using buildMeetingBriefPrompt. Call aiClient.generate(). Parse response with Zod schema. Return structured MeetingBriefResponse with ai_generated, ai_label, editable flags. Handle: account not found (404), soft-deleted account (404), no data (return brief with "Limited recent activity" note).

### T189: Implement meeting brief service tests
- **US**: US-2 (Meeting Preparation Brief) | **Refs**: FR-AI-003, AC-030a, AC-030b
- **Files**: `backend/src/domains/ai/meeting-brief.service.test.ts` (NEW)
- **Workspace**: backend
- **Dependencies**: T188
- **Description**: Test cases: happy path with full account data, account not found, soft-deleted account, empty activity/order history, AI provider failure (503), response parsing (valid/invalid JSON from AI), AI labeling (ai_generated, ai_label, editable), tenant isolation. Mock AI client at service boundary.

### T190: Implement email draft service
- **US**: US-3 (AI Email Draft) | **Refs**: FR-AI-004, FR-030
- **Files**: `backend/src/domains/ai/email-draft.service.ts` (NEW)
- **Workspace**: backend
- **Dependencies**: T186, T187
- **Description**: Create `generateEmailDraft(prisma, aiClient, tenantId, accountId, contactId, purpose, options)`. Query: contact (validate has email), account context, recent activities, optional products (if product_ids provided). Format data into prompt using buildEmailDraftPrompt. Call aiClient.generate(). Parse response. Return EmailDraftResponse. Handle: contact not found, contact no email (400), account not found. Support 6 purposes: follow_up, introduction, product_pitch, meeting_request, thank_you, custom. [P — parallel with T188]

### T191: Implement email draft service tests
- **US**: US-3 (AI Email Draft) | **Refs**: FR-AI-004
- **Files**: `backend/src/domains/ai/email-draft.service.test.ts` (NEW)
- **Workspace**: backend
- **Dependencies**: T190
- **Description**: Test cases: happy path for each purpose type (follow_up, product_pitch, custom), contact without email (400), contact not found, product references included, AI provider failure, response parsing, AI labeling, tenant isolation. Mock AI client. [P — parallel with T189]

### T192: Implement AI routes (meeting brief + email draft)
- **US**: US-2, US-3 | **Refs**: FR-AI-008, FR-AI-010
- **Files**: `backend/src/domains/ai/ai.routes.ts` (NEW), `backend/src/app.ts` (MOD)
- **Workspace**: backend
- **Dependencies**: T188, T190
- **Description**: Create routes: POST /api/ai/meeting-brief, POST /api/ai/email-draft. Each route: authenticate + authorize('rep', 'manager', 'admin'), parse request with Zod schema, call service, handle errors (AIError → 503, validation → 400, not found → 404). Create AIError class with code field. Register in app.ts.

### T193: Implement AI route integration tests (meeting brief + email draft)
- **US**: US-2, US-3 | **Refs**: FR-AI-008, FR-AI-010
- **Files**: `backend/src/domains/ai/ai.routes.test.ts` (NEW — partial, meeting brief + email draft)
- **Workspace**: backend
- **Dependencies**: T192
- **Description**: Integration tests for meeting brief and email draft routes: RBAC enforcement (viewer → 403, logistics → 403, rep → 200), request validation (invalid UUID → 400), error responses (AI unavailable → 503), AI labeling in response, tenant isolation. Mock AI SDK at module level.

---

## Batch 27: Activity Summary, Rate Limiting, Audit & Polish (T194-T199)

**Branch**: `feature/batch-batch-27-ai-summary-polish`
**Focus**: Activity summary service, rate limiting, audit logging, RBAC edge cases

### T194: Implement activity summary service
- **US**: US-4 (AI Activity Summary) | **Refs**: FR-AI-005, FR-030
- **Files**: `backend/src/domains/ai/activity-summary.service.ts` (NEW)
- **Workspace**: backend
- **Dependencies**: T186, T187
- **Description**: Create `generateActivitySummary(prisma, aiClient, tenantId, accountId, periodMonths)`. Query: account, activities within period (max 50, ordered by createdAt desc). Format data into prompt using buildActivitySummaryPrompt. Call aiClient.generate(). Parse response. Return ActivitySummaryResponse. Handle: account not found, no activities (return "No recorded activities" assessment), soft-deleted account.

### T195: Implement activity summary service tests
- **US**: US-4 (AI Activity Summary) | **Refs**: FR-AI-005
- **Files**: `backend/src/domains/ai/activity-summary.service.test.ts` (NEW)
- **Workspace**: backend
- **Dependencies**: T194
- **Description**: Test cases: happy path with activities, empty activity set, custom period (12 months), account not found, AI provider failure, response parsing, AI labeling, tenant isolation, activity count capping at 50. Mock AI client.

### T196: Add activity summary route + complete route file
- **US**: US-4, US-5 | **Refs**: FR-AI-005, FR-AI-008, FR-AI-010
- **Files**: `backend/src/domains/ai/ai.routes.ts` (MOD)
- **Workspace**: backend
- **Dependencies**: T194, T192
- **Description**: Add POST /api/ai/activity-summary route to existing ai.routes.ts. Same pattern: authenticate, authorize, parse, call service, handle errors. Add per-endpoint rate limiting using Redis-based counter: 10/min for meeting-brief and activity-summary, 15/min for email-draft. Rate limit key: `ai:ratelimit:{userId}:{endpoint}`.

### T197: Implement AI audit logging
- **US**: US-5 (AI Request Audit) | **Refs**: FR-AI-009
- **Files**: `backend/src/domains/ai/ai.routes.ts` (MOD)
- **Workspace**: backend
- **Dependencies**: T196
- **Description**: Add audit logging to all 3 AI routes using the existing `writeAuditLog` service. Log after each request (success or failure): entityType='ai_request', action='ai_meeting_brief'/'ai_email_draft'/'ai_activity_summary', newValue containing provider, responseTimeMs, tokenCount, success. Add requestId as correlationId.

### T198: Implement activity summary + rate limit + audit route tests
- **US**: US-4, US-5 | **Refs**: FR-AI-005, FR-AI-008, FR-AI-009
- **Files**: `backend/src/domains/ai/ai.routes.test.ts` (MOD — add activity summary + rate limit + audit tests)
- **Workspace**: backend
- **Dependencies**: T196, T197
- **Description**: Integration tests: activity summary route (RBAC, validation, error handling), rate limiting (send 11 requests → verify 429), audit log verification (check writeAuditLog called with correct parameters for success and failure cases), all 3 endpoints have consistent error response format.

### T199: RBAC enforcement and edge case tests
- **US**: US-1, US-2, US-3, US-4 | **Refs**: FR-AI-010
- **Files**: `backend/src/domains/ai/ai.routes.test.ts` (MOD — add RBAC matrix + edge cases)
- **Workspace**: backend
- **Dependencies**: T198
- **Description**: Comprehensive RBAC matrix tests: all 5 roles (admin, manager, rep, logistics, viewer) × all 3 AI endpoints. Edge cases: malformed request body, missing required fields, concurrent requests for same account, very large account with many activities (verify 50-activity cap). Verify no cross-tenant data leakage.
