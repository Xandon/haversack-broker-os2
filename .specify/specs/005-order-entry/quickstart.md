# Quickstart Validation — 005-order-entry

## Key Validation Scenarios

### Scenario 1: Create and Submit a Draft Order (P1)
1. Create draft order with 3 line items across 2 brands
2. Verify order persists with correct totals
3. Submit order (total < $5,000)
4. Verify status transitions to "confirmed"
5. Verify vendor sub-orders are created (2 sub-orders, one per brand)
6. Verify audit trail entries for create and submit

### Scenario 2: High-Value Order Approval Workflow (P1)
1. Create draft order totaling $6,200
2. Submit order
3. Verify status = "pending_approval"
4. Verify notification sent to manager (in-app + email job queued)
5. Manager approves → status = "confirmed"
6. Verify audit trail records approval decision

### Scenario 3: Order Rejection (P1)
1. Submit order >= $5,000
2. Manager rejects with reason "Pricing not approved by vendor"
3. Verify status = "rejected"
4. Verify notification sent to rep with rejection reason
5. Verify audit trail records rejection

### Scenario 4: Product Search (P1)
1. Search for "honey" in product search
2. Verify results include product name, SKU, brand, price, availability
3. Verify promotional price is shown when active
4. Verify search returns within 200ms

### Scenario 5: Promotional Price Application (P1)
1. Product has active promo ($8.50, regular $10.00, valid through 2026-04-01)
2. Add product to order on 2026-03-15
3. Verify promo price ($8.50) is used as default unit price
4. Verify promotionalPriceApplied = true on line item

### Scenario 6: AI Reorder Suggestion (P2)
1. Account with 6+ orders in past 12 months
2. Request reorder suggestion
3. Verify suggestion returns products with quantities and estimated total
4. Verify AI-generated flag is true
5. Verify response within 3 seconds

### Scenario 7: QuickBooks Export (P2)
1. Order confirmed
2. Hourly export job runs
3. Verify order appears in export queue
4. Verify CSV generated with correct fields
5. Verify export status = "exported" on order record

### Scenario 8: Edge Cases
1. Submit order with 0 line items → error
2. Edit confirmed order → error (only drafts editable)
3. Account with < 6 orders → "Not enough history" response
4. AI service timeout → graceful error, no stale data
5. QB export failure with retries → status = "failed" after 3 attempts, admin notified
