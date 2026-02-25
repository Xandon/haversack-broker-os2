# API Contract: AI Features

**Domain**: AI Reorder Suggestions, Meeting Briefs, Email Drafts, Activity Summaries
**Base Path**: `/api/v1/ai`
**Auth**: All endpoints require JWT Bearer token. RLS enforced via tenant_id.
**AI Provider**: Anthropic Claude API (primary), OpenAI (fallback), provider abstraction layer.
**Performance**: All AI endpoints must return within 3 seconds at p95 (NFR-005). Hard timeout at 10 seconds.

---

## POST /api/v1/ai/reorder-suggestions

Generate AI-powered reorder suggestions for an Account.

**Implements**: FR-018, FR-035, FR-036

**Auth Required**: Role `rep`, `manager`, `admin`

**Rate Limit**: 10 requests/minute/user

**Performance**: Response within 3 seconds at p95 (FR-018)

**Request Body**:
```typescript
{
  account_id: z.string().uuid()
}
```

**Response 200 OK** (Account has 6+ orders — FR-018):
```json
{
  "data": {
    "account_id": "uuid",
    "account_name": "Pacific Bistro",
    "ai_generated": true,
    "ai_label": "AI-Generated",
    "suggestion": {
      "items": [
        {
          "product_id": "uuid",
          "product_name": "Organic Wildflower Honey 12oz",
          "sku": "BEE-HON-12",
          "brand_name": "Bee's Best Honey",
          "suggested_quantity": 24,
          "unit_price": 8.50,
          "line_total": 204.00,
          "reasoning": "Ordered 24 units monthly for the past 4 months"
        },
        {
          "product_id": "uuid",
          "product_name": "Artisan Hot Sauce 5oz",
          "sku": "NWS-HTS-05",
          "brand_name": "NW Spice Co",
          "suggested_quantity": 12,
          "unit_price": 6.75,
          "line_total": 81.00,
          "reasoning": "Trending up — last 3 orders increased quantity"
        }
      ],
      "estimated_total": 285.00,
      "based_on_orders": 8,
      "analysis_period_months": 12
    },
    "generated_at": "2026-02-24T14:30:00Z"
  }
}
```

**Response 200 OK** (Account has < 6 orders — FR-018):
```json
{
  "data": {
    "account_id": "uuid",
    "account_name": "New Restaurant",
    "ai_generated": false,
    "suggestion": null,
    "message": "Not enough order history for suggestions — reorder suggestions appear after 6 orders",
    "current_order_count": 3
  }
}
```

**Response 503 Service Unavailable** (AI unavailable — FR-036):
```json
{
  "error": "AI_SERVICE_UNAVAILABLE",
  "message": "AI service temporarily unavailable — please try again in a few minutes",
  "code": "AI_UNAVAILABLE",
  "requestId": "uuid"
}
```

**Note**: No stale or cached AI content is returned when the service is unavailable (FR-036).

---

## POST /api/v1/ai/reorder-suggestions/submit

Submit a modified reorder suggestion as a new order.

**Implements**: FR-018

**Auth Required**: Role `rep`, `manager`, `admin`

**Rate Limit**: 10 requests/minute/user

**Request Body**:
```typescript
{
  account_id: z.string().uuid(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().min(1),
    unit_price: z.number().min(0).optional()
  })).min(1),
  notes: z.string().optional()
}
```

**Response 201 Created**:
```json
{
  "data": {
    "order_id": "uuid",
    "order_number": "ORD-2026-001055",
    "status": "pending",
    "total": 285.00,
    "source": "ai_reorder_suggestion"
  }
}
```

---

## POST /api/v1/ai/meeting-brief

Generate an AI-powered meeting brief for an Account.

**Implements**: FR-035, FR-036

**Auth Required**: Role `rep`, `manager`, `admin`

**Rate Limit**: 10 requests/minute/user

**Performance**: Response within 3 seconds at p95 (FR-035)

**Request Body**:
```typescript
{
  account_id: z.string().uuid()
}
```

**Response 200 OK** (FR-035):
```json
{
  "data": {
    "account_id": "uuid",
    "account_name": "Pacific Bistro",
    "ai_generated": true,
    "ai_label": "AI-Generated",
    "brief": {
      "key_contacts": [
        {
          "name": "Bob Jones",
          "title": "Head Buyer",
          "last_interaction": "2026-02-18",
          "interaction_type": "email"
        }
      ],
      "activity_summary": "15 interactions in the past 6 months. Last visit was Feb 18 — discussed expanding honey selection. Bob expressed interest in organic certifications.",
      "order_trends": {
        "total_orders_12m": 8,
        "total_revenue_12m": 12500.00,
        "average_order_value": 1562.50,
        "trend": "increasing",
        "top_products": [
          { "name": "Organic Wildflower Honey 12oz", "order_count": 6, "total_qty": 144 }
        ]
      },
      "talking_points": [
        "Follow up on honey line expansion discussion from Feb 18 visit",
        "New organic hot sauce line available — aligns with their certification preferences",
        "Spring promotional pricing on Bee's Best Honey starts March 1"
      ],
      "health_score": 72,
      "health_trend": "stable"
    },
    "editable": true,
    "generated_at": "2026-02-24T14:30:00Z"
  }
}
```

**Response 503 Service Unavailable** (AI unavailable — FR-036):
```json
{
  "error": "AI_SERVICE_UNAVAILABLE",
  "message": "AI service temporarily unavailable — please try again in a few minutes",
  "code": "AI_UNAVAILABLE",
  "requestId": "uuid"
}
```

---

## POST /api/v1/ai/email-draft

Generate an AI-powered email draft for a Contact.

**Implements**: FR-035, FR-036

**Auth Required**: Role `rep`, `manager`, `admin`

**Rate Limit**: 15 requests/minute/user

**Performance**: Response within 3 seconds at p95 (FR-035)

**Request Body**:
```typescript
{
  account_id: z.string().uuid(),
  contact_id: z.string().uuid(),
  purpose: z.enum(['follow_up', 'introduction', 'product_pitch', 'meeting_request', 'thank_you', 'custom']),
  context: z.string().max(1000).optional(),         // additional context for the AI
  product_ids: z.array(z.string().uuid()).optional(), // products to reference
  tone: z.enum(['professional', 'friendly', 'urgent']).default('professional')
}
```

**Response 200 OK** (FR-035):
```json
{
  "data": {
    "ai_generated": true,
    "ai_label": "AI-Generated",
    "draft": {
      "to_email": "bob@pacificbistro.com",
      "to_name": "Bob Jones",
      "subject": "Following Up on Our Honey Line Discussion",
      "body": "Hi Bob,\n\nGreat catching up at the store last Tuesday. I wanted to follow up on our conversation about expanding your honey selection...\n\nBest regards,\nJane Smith\nHaversack Sales",
      "suggested_send_time": "2026-02-25T09:00:00Z"
    },
    "editable": true,
    "generated_at": "2026-02-24T14:30:00Z"
  }
}
```

**Response 503 Service Unavailable** (AI unavailable — FR-036):
```json
{
  "error": "AI_SERVICE_UNAVAILABLE",
  "message": "AI service temporarily unavailable — please try again in a few minutes",
  "code": "AI_UNAVAILABLE",
  "requestId": "uuid"
}
```

---

## POST /api/v1/ai/activity-summary

Generate an AI-powered activity summary for an Account.

**Implements**: FR-035, FR-036

**Auth Required**: Role `rep`, `manager`, `admin`

**Rate Limit**: 10 requests/minute/user

**Performance**: Response within 3 seconds at p95 (FR-035)

**Request Body**:
```typescript
{
  account_id: z.string().uuid(),
  period_months: z.number().int().min(1).max(24).default(6)
}
```

**Response 200 OK** (FR-035):
```json
{
  "data": {
    "account_id": "uuid",
    "account_name": "Pacific Bistro",
    "ai_generated": true,
    "ai_label": "AI-Generated",
    "summary": {
      "period": "Aug 2025 — Feb 2026",
      "total_activities": 15,
      "activity_breakdown": {
        "visits": 6,
        "calls": 4,
        "emails": 3,
        "demos": 2
      },
      "narrative": "Strong engagement with Pacific Bistro over the past 6 months. Regular monthly visits with increasing order volume. Bob Jones is the primary buyer contact — prefers email follow-ups. Two product demos completed (honey and hot sauce) with positive feedback on both.",
      "key_events": [
        "Feb 18 — Store visit, discussed honey line expansion",
        "Jan 22 — Demo: Organic Hot Sauce (interested)",
        "Dec 15 — Quarterly review meeting"
      ],
      "engagement_assessment": "High engagement — account is healthy and growing"
    },
    "editable": true,
    "generated_at": "2026-02-24T14:30:00Z"
  }
}
```

**Response 503 Service Unavailable** (AI unavailable — FR-036):
```json
{
  "error": "AI_SERVICE_UNAVAILABLE",
  "message": "AI service temporarily unavailable — please try again in a few minutes",
  "code": "AI_UNAVAILABLE",
  "requestId": "uuid"
}
```

---

## Common AI Error Handling

All AI endpoints follow the same degradation pattern per FR-036 and Constitution Section VI:

1. **Primary provider** (Anthropic Claude API) is attempted first.
2. On failure, **fallback provider** (OpenAI) is attempted.
3. If both fail or timeout (5-second hard timeout per provider, 10-second total), return 503 with the standard error message.
4. **No stale content**: Previous AI-generated content is never cached and returned when the service is unavailable.
5. **All AI content is labeled**: Every response includes `ai_generated: true` and `ai_label: "AI-Generated"` (FR-035).
6. **All AI content is editable**: Every response includes `editable: true` (FR-035).
