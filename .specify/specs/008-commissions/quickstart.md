# Quickstart: Commissions (008)

## Key Validation Scenarios

### 1. Commission Calculation Accuracy
1. Create a commission rule: brand "Test Brand", base rate 10%, modifier 1.0x, 3 tiers
2. Create a confirmed broker order with a $12,000 line item for "Test Brand"
3. Trigger commission calculation
4. Verify: commission = $12,000 * 11% (10% base + 1% tier 2 bonus) * 1.0 = $1,320
5. Verify: audit trail contains rule ID, rates, tier, and amount

### 2. Rate Effective Date Logic
1. Create rule A: base rate 10%, effective 2026-01-01
2. Create rule B (new version): base rate 12%, effective 2026-04-01
3. Process order confirmed on 2026-03-15 -> should use 10% rate
4. Process order confirmed on 2026-04-02 -> should use 12% rate

### 3. Monthly Statement Generation
1. Create 3 commission entries for Rep A in March 2026
2. Trigger statement generation for March 2026
3. Verify: statement created with status "Pending", total = sum of 3 entries
4. Verify: YTD includes Jan + Feb + Mar totals

### 4. Statement Approval with Dispute Block
1. Create pending statement with 5 entries
2. File dispute on entry #3
3. Attempt approval -> should fail with "Cannot approve with unresolved disputes"
4. Resolve dispute
5. Retry approval -> should succeed

### 5. QuickBooks Export
1. Create 3 approved statements for March 2026
2. Trigger export
3. Verify: CSV contains 3 rows with Rep name, period, total
4. Verify: statements marked as "Exported"
5. Re-trigger export -> should warn "already exported"

### 6. Wholesale Order Exclusion
1. Create order with 2 broker lines and 1 wholesale line
2. Process commissions
3. Verify: only 2 commission entries created (wholesale excluded)
