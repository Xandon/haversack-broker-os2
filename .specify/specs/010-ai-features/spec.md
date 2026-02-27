# Feature Specification: AI Features

**Feature Branch**: `010-ai-features`
**Created**: 2026-02-27
**Status**: Draft
**Input**: AI-powered meeting briefs, email drafts, and activity summaries with provider abstraction layer (Anthropic Claude primary, OpenAI fallback)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI Provider Abstraction Layer (Priority: P1)

As a **system administrator**, I need a provider abstraction layer that transparently routes AI requests to Anthropic Claude API (primary) with automatic failover to OpenAI, so that the platform has reliable AI capabilities with graceful degradation.

**Why this priority**: All other AI features depend on this foundational layer. Without it, no LLM-powered features can function.

**Independent Test**: Can be fully tested by sending a prompt through the provider layer and verifying it returns a response within the timeout constraints, with automatic failover when the primary provider is unavailable.

**Acceptance Scenarios**:

1. **Given** the AI provider layer is configured with valid Anthropic API credentials, **When** a request is sent with a prompt, **Then** the system routes to Anthropic Claude API and returns a response within 5 seconds per-provider timeout.
2. **Given** the Anthropic Claude API returns HTTP 503 or times out after 5 seconds, **When** a request is sent, **Then** the system automatically fails over to the OpenAI provider and returns a response within the remaining time budget (10-second total timeout).
3. **Given** both Anthropic and OpenAI providers are unavailable, **When** a request is sent, **Then** the system returns a structured error `AI_SERVICE_UNAVAILABLE` with message "AI service temporarily unavailable — please try again in a few minutes" and does not return stale or partial content.
4. **Given** the AI provider is processing a request, **When** the total elapsed time exceeds 10 seconds, **Then** the system aborts the request and returns the `AI_UNAVAILABLE` error regardless of provider state.

**References**: NFR-005, FR-030

---

### User Story 2 - Meeting Preparation Brief (Priority: P1)

As a **territory representative**, I want to generate an AI-powered meeting preparation brief for an account before a meeting, so that I am well-prepared with recent activity, order trends, key contacts, and AI-suggested talking points.

**Why this priority**: Meeting briefs are the highest-value AI feature — they save reps significant preparation time before every account visit.

**Independent Test**: Can be fully tested by requesting a meeting brief for an account with sufficient activity history and verifying the structured response contains all required sections.

**Acceptance Scenarios**:

1. **Given** an Account has 15 logged activities and 8 orders in the past 6 months, **When** a Rep clicks "Prepare Meeting Brief," **Then** the system returns a structured meeting brief containing: key contacts (with last interaction date and type), recent activity summary, order trends (total orders, revenue, average order value, trend direction, top products), and suggested talking points — all within 3 seconds, labeled "AI-Generated," and displayed in an editable format. (AC-030a)
2. **Given** the AI provider is unavailable (HTTP 503 or timeout after 5 seconds), **When** a Rep requests a meeting brief, **Then** the system displays "AI service temporarily unavailable — please try again in a few minutes" and does not display stale or partial AI content. (AC-030b)
3. **Given** an Account has no activities or orders in the past 12 months, **When** a Rep requests a meeting brief, **Then** the system returns a brief with available data (health score, contacts) and notes "Limited recent activity — consider reaching out to re-engage this account."
4. **Given** a Rep generates a meeting brief, **When** the brief is displayed, **Then** it includes the `ai_generated: true` flag, `ai_label: "AI-Generated"` label, and `editable: true` flag per FR-030.

**References**: FR-030, AC-030a, AC-030b, NFR-005

---

### User Story 3 - AI Email Draft Generation (Priority: P2)

As a **territory representative**, I want to generate AI-powered email drafts for contacts based on account context, so that I can quickly compose professional follow-ups, introductions, and product pitches.

**Why this priority**: Email drafts complement meeting briefs and reduce rep administrative overhead, but are secondary to the core brief capability.

**Independent Test**: Can be fully tested by requesting an email draft for a specific contact with a purpose and verifying the response contains a properly formatted email with subject, body, and AI labeling.

**Acceptance Scenarios**:

1. **Given** a Rep selects a Contact and chooses purpose "follow_up" with optional context, **When** the draft is generated, **Then** the system returns an email draft with to_email, to_name, subject line, body text, and suggested send time — all labeled "AI-Generated" and editable.
2. **Given** a Rep requests an email draft with purpose "product_pitch" and provides product_ids, **When** the draft is generated, **Then** the system incorporates the specified product details (names, pricing, certifications) into the email body.
3. **Given** the Contact has no email address, **When** a Rep requests an email draft, **Then** the system returns a 400 error with message "Contact does not have an email address."

**References**: FR-030, NFR-005

---

### User Story 4 - AI Activity Summary (Priority: P2)

As a **territory representative** or **sales manager**, I want to generate an AI-powered activity summary for an account over a configurable time period, so that I can quickly understand engagement patterns and key events without reading through individual activity records.

**Why this priority**: Activity summaries complement meeting briefs with a deeper engagement analysis but are not required for the core meeting prep workflow.

**Independent Test**: Can be fully tested by requesting an activity summary for an account with logged activities and verifying the structured narrative response.

**Acceptance Scenarios**:

1. **Given** an Account has 15 activities over the past 6 months, **When** a Rep requests an activity summary with default period (6 months), **Then** the system returns a summary containing: period label, total activity count, breakdown by type (visits, calls, emails, demos), narrative summary, key events list, and engagement assessment — labeled "AI-Generated" and editable.
2. **Given** a Manager requests an activity summary for an account with `period_months: 12`, **When** the summary is generated, **Then** the system analyzes the full 12-month window of activities.
3. **Given** an Account has zero activities in the requested period, **When** a summary is requested, **Then** the system returns a summary noting "No recorded activities in this period" with an engagement assessment of "No engagement."

**References**: FR-030, NFR-005

---

### User Story 5 - AI Request Audit & Rate Limiting (Priority: P3)

As a **system administrator**, I want all AI requests to be logged with correlation IDs and rate-limited per user, so that AI API usage is tracked, costs are controllable, and abuse is prevented.

**Why this priority**: Observability and cost control are important but secondary to the core AI features.

**Independent Test**: Can be fully tested by sending AI requests and verifying audit log entries and rate limit enforcement.

**Acceptance Scenarios**:

1. **Given** a Rep sends an AI request, **When** the request completes (success or failure), **Then** the system logs a structured audit record containing: user_id, tenant_id, request_type (meeting_brief, email_draft, activity_summary), provider_used, response_time_ms, token_count (if available), and success/failure status.
2. **Given** a user has made 10 AI requests in the past minute, **When** the user sends an 11th request, **Then** the system returns HTTP 429 with message "Rate limit exceeded — please wait before making another AI request."
3. **Given** an AI request fails due to provider unavailability, **When** the audit log is written, **Then** the log includes the provider attempted, failure reason, and whether failover was attempted.

**References**: NFR-005, FR-030

---

### Edge Cases

- AI provider returns malformed/incomplete JSON: system discards the response and returns `AI_UNAVAILABLE` error.
- AI provider returns content that exceeds maximum token budget: system truncates to the configured maximum and appends a note "(Truncated — full analysis may be available on retry)."
- Account has been soft-deleted: AI requests for the account return 404 "Account not found."
- Concurrent AI requests for the same account: system processes both independently (no deduplication).
- AI provider rate-limits the API key (HTTP 429 from provider): treated as provider unavailability, triggers failover.
- Request includes an account_id from a different tenant: system returns 404 (tenant isolation via RLS).
- Very large account with 1000+ activities: system limits context to the most recent 50 activities for the AI prompt to stay within token limits.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-AI-001**: System MUST implement a provider abstraction layer that routes AI requests to Anthropic Claude API as the primary provider, with automatic failover to OpenAI when the primary is unavailable (HTTP 5xx, timeout, or rate-limited).
- **FR-AI-002**: System MUST enforce a 5-second timeout per individual provider and a 10-second total timeout for any AI request including failover.
- **FR-AI-003**: System MUST generate meeting preparation briefs containing: key contacts, recent activity summary, order trends (total orders, revenue, average order value, trend direction, top products), suggested talking points, health score, and health trend.
- **FR-AI-004**: System MUST generate contextual email drafts with support for 6 purposes: follow_up, introduction, product_pitch, meeting_request, thank_you, and custom — incorporating account context, contact details, and optional product references.
- **FR-AI-005**: System MUST generate activity summaries with configurable time period (1-24 months), containing: period label, activity counts by type, narrative summary, key events, and engagement assessment.
- **FR-AI-006**: System MUST label all AI-generated content with `ai_generated: true`, `ai_label: "AI-Generated"`, and `editable: true`.
- **FR-AI-007**: System MUST return no stale or cached AI content when the AI service is unavailable. Only fresh responses are served.
- **FR-AI-008**: System MUST rate-limit AI requests at 10 requests/minute/user for meeting briefs and activity summaries, and 15 requests/minute/user for email drafts.
- **FR-AI-009**: System MUST log all AI requests with structured audit records including: user_id, tenant_id, request_type, provider_used, response_time_ms, token_count, and success/failure status.
- **FR-AI-010**: System MUST enforce RBAC for all AI endpoints — only `rep`, `manager`, and `admin` roles can access AI features.

### Key Entities

- **AIProvider**: Abstraction representing an LLM provider (Anthropic or OpenAI) with a `generateCompletion(prompt, options)` interface.
- **AIRequest**: A request record tracking provider, type, timing, and outcome for audit purposes.
- **MeetingBrief**: Structured output containing key_contacts, activity_summary, order_trends, talking_points, health_score, health_trend.
- **EmailDraft**: Structured output containing to_email, to_name, subject, body, suggested_send_time.
- **ActivitySummary**: Structured output containing period, activity_breakdown, narrative, key_events, engagement_assessment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: AI meeting briefs return structured responses within 3 seconds at p95 latency under normal conditions.
- **SC-002**: Automatic provider failover completes within the 10-second total timeout window with no user-visible error when one provider is available.
- **SC-003**: All AI-generated content includes the `ai_generated`, `ai_label`, and `editable` fields.
- **SC-004**: Rate limiting prevents any user from exceeding 10 requests/minute for meeting briefs and activity summaries.
- **SC-005**: 100% of AI requests produce an audit log record regardless of outcome.
- **SC-006**: AI service unavailability returns a clear error message without stale content within 200ms of the timeout.

## Clarifications

1. **AI model selection**: Use `claude-sonnet-4-6` for Anthropic (speed/cost balance). Configurable via `ANTHROPIC_MODEL` env var. **Rationale:** Sonnet provides sufficient quality for structured data summarization at lower cost and latency than Opus.
2. **OpenAI fallback model**: Use `gpt-4o-mini` as the fallback. Configurable via `OPENAI_MODEL` env var. **Rationale:** Fastest capable OpenAI model that can handle structured output generation.
3. **Meeting brief data window**: Trailing 12 months, resolving the PRD open question for FR-030. **Rationale:** 12 months captures seasonal patterns without overwhelming the context window.
4. **Prompt engineering approach**: Prompt templates stored as constant strings in a dedicated `prompts.ts` file. **Rationale:** Allows prompt iteration without modifying service logic.
5. **AI response parsing**: Use Zod schemas to validate LLM JSON output. On parse failure, retry once with a stricter prompt. If still invalid, return `AI_UNAVAILABLE`. **Rationale:** Zod validation aligns with project conventions and prevents malformed data from reaching the API response.
6. **Token usage tracking**: Track `input_tokens` and `output_tokens` from provider response metadata. Store in audit log. Log `null` if provider doesn't return token counts. **Rationale:** Essential for cost monitoring without adding complexity.
7. **Email draft sender identity**: Use the requesting user's full name for the signature. AI generates the body; system fills in From/To metadata. **Rationale:** Keeps email identity consistent with the authenticated user.
8. **Activity summary context limit**: Maximum 50 most recent activities included in AI prompt. **Rationale:** Prevents token budget overruns for high-activity accounts while capturing meaningful engagement patterns.
9. **No caching/deduplication**: Each AI request generates a fresh call. No response caching. **Rationale:** Per FR-AI-007, only fresh responses are served. Simplifies implementation and avoids stale content.

## Assumptions

- Anthropic Claude API and OpenAI API keys will be provided as environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`).
- The existing reorder suggestion service (Feature 4) remains as a standalone statistical engine — it does not use the AI provider layer.
- The AI provider abstraction layer will be placed in `backend/src/shared/ai/` as a cross-domain utility.
- Activity, Order, Contact, and Account data required for meeting briefs already exists from Features 1-8.
- AI context windows are managed by the application — prompts are assembled from database data, not sent raw.
- Meeting brief data window defaults to trailing 12 months (resolving PRD open question for FR-030).
