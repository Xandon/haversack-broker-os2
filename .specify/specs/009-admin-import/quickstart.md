# Quickstart: Admin & Data Import

## Key Validation Scenarios

### 1. User Management
- Create user with role "rep" and territory assignment → verify user can authenticate
- Change user role from "rep" to "manager" → verify new permissions on next token refresh
- Deactivate user → verify all refresh tokens invalidated, user cannot authenticate
- Attempt to deactivate self → verify 400 error

### 2. CSV Import
- Upload 200-row Account CSV with 5 invalid rows → verify preview shows 195 valid / 5 errors
- Confirm import → verify 195 accounts created, 5 skipped, audit trail written
- Upload file >50 MB → verify 413 rejection
- Upload file with unknown columns → verify warning in preview, columns ignored

### 3. Data Quality Scorecard
- Run quality calculation → verify all 5 metrics calculated
- Access scorecard as admin → verify 200 with all metrics
- Access scorecard as rep → verify 403 Forbidden
- Drill-down on "account completeness" → verify filtered list of incomplete accounts
