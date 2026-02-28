# Research — 005-order-entry

**Reference Domain:** accounts (most mature domain with full CRUD, search, audit patterns)
**Secondary References:** activities (for sub-entity patterns), worker jobs (for background processing)

## Decision 1: Service Layer Pattern

**Decision:** Follow the account service pattern — functions receive `(prisma, tenantId, data, audit)`, return typed results, throw domain-specific errors.

**Rationale:** Consistent with 3 existing domains. Tenant isolation is first parameter after prisma. Audit context passed on all writes.

**Pattern:**
```typescript
export async function createOrder(
  prisma: PrismaClient, tenantId: string, data: CreateOrderInput, audit: AuditContext
): Promise<Order>
```

## Decision 2: Order Status State Machine

**Decision:** Implement order status transitions as a validated state machine in the service layer.

**Rationale:** Orders have complex status transitions (Draft → Pending Approval / Confirmed, Pending Approval → Confirmed / Rejected, any → Cancelled). Must be enforced at service level, not just DB constraints.

**Alternatives Considered:**
- Prisma middleware for validation — rejected, too opaque for debugging
- Database triggers — rejected, harder to test and maintain

## Decision 3: Vendor Sub-Order Splitting

**Decision:** Split orders into vendor sub-orders at submission time (status transition from Draft to Pending/Confirmed). During draft editing, line items are stored flat on the parent order.

**Rationale:** Splitting too early (during draft editing) would complicate add/remove/edit of line items. Splitting at submission is a clean transactional boundary.

**Pattern:** Use Prisma transaction to atomically create sub-orders and update order status.

## Decision 4: Product/Brand Stub Models

**Decision:** Add minimal Product and Brand models in the first batch with only fields required by order line items. Feature 5 (Product Catalog) will extend these models.

**Rationale:** Orders require product references for line items. Adding stubs avoids blocking while maintaining referential integrity.

**Stub fields:**
- Brand: id, tenantId, name, commissionRate, isActive
- Product: id, tenantId, brandId, name, sku, unitPrice, wholesalePrice, revenueModelDefault, availabilityStatus, isActive

## Decision 5: Approval Notification Pattern

**Decision:** Extend existing NotificationType enum with order-specific types. Use existing notification + email worker pattern for approval notifications.

**Rationale:** Notification infrastructure already exists (Feature 3). Adding new enum values is additive.

**New types:** `order_approval_required`, `order_approved`, `order_rejected`, `order_export_failed`

## Decision 6: QuickBooks Export Pattern

**Decision:** Implement as a BullMQ cron job (hourly) that scans for confirmed orders not yet exported. Generate CSV format. Store export status on order record.

**Rationale:** PRD specifies "within 1 hour of confirmation" and CSV format. BullMQ cron aligns with existing health-score job pattern. Direct API integration is future work.

**Pattern:** New queue `quickbooks-export` with hourly cron. Job reads confirmed orders where exportStatus = null, generates CSV, updates status.

## Decision 7: AI Reorder Suggestions

**Decision:** Implement as a service function called on-demand (not pre-computed). Use the AI provider abstraction layer. Cache suggestions with 24h TTL in Redis.

**Rationale:** PRD says "within 3 seconds." On-demand generation with caching gives fresh suggestions without pre-computation overhead. Aligns with AI timeout (5s soft, 10s hard from NFR-005).

**Pattern:** `GET /api/accounts/:id/reorder-suggestion` → check Redis cache → if miss, call AI service → cache result → return.
