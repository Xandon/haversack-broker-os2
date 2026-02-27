# Quickstart — Feature 10: Dashboards & Reports

## Key Validation Scenarios

### 1. Rep Dashboard — Basic KPIs
```bash
# Authenticate as a rep
TOKEN=$(curl -s -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"rep@test.com","password":"test"}' | jq -r '.data.accessToken')

# Get rep dashboard
curl -s localhost:3000/api/dashboards/rep \
  -H "Authorization: Bearer $TOKEN" | jq
# Expect: revenue, activities, opportunities, commissions, accountHealth sections
```

### 2. Rep Dashboard — Critical Accounts Drill-Down
```bash
curl -s localhost:3000/api/dashboards/rep/critical-accounts \
  -H "Authorization: Bearer $TOKEN" | jq
# Expect: array of accounts with healthScore < 40
```

### 3. Manager Team Dashboard
```bash
# Authenticate as manager
TOKEN=$(curl -s -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"manager@test.com","password":"test"}' | jq -r '.data.accessToken')

# Get team dashboard with date filter
curl -s "localhost:3000/api/dashboards/team?period=current_quarter" \
  -H "Authorization: Bearer $TOKEN" | jq
# Expect: repRankings array with all reps, totals object
```

### 4. Revenue By Month Chart Data
```bash
curl -s "localhost:3000/api/dashboards/team/revenue-by-month?months=6" \
  -H "Authorization: Bearer $TOKEN" | jq
# Expect: array of {month, revenue} for last 6 months
```

### 5. Custom Report — Execute
```bash
curl -s -X POST localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "entityType": "ORDER",
    "filters": {"dateRange": {"start": "2026-01-01", "end": "2026-03-31"}},
    "columns": ["orderNumber", "accountName", "totalAmount", "status"],
    "limit": 10
  }' | jq
# Expect: data array, pagination, columns metadata
```

### 6. Custom Report — XLSX Export
```bash
curl -s -X POST localhost:3000/api/reports/export \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "entityType": "ORDER",
    "filters": {},
    "columns": ["orderNumber", "totalAmount"],
    "format": "xlsx"
  }' -o report.xlsx
# Expect: valid XLSX file with column headers
```

### 7. RBAC — Rep Cannot Access Reports
```bash
# Authenticate as rep
TOKEN=$(curl -s -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"rep@test.com","password":"test"}' | jq -r '.data.accessToken')

curl -s -X POST localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"entityType":"ORDER","filters":{},"columns":["orderNumber"],"limit":10}'
# Expect: 403 Forbidden
```

### 8. RBAC — Rep Cannot Access Team Dashboard
```bash
curl -s localhost:3000/api/dashboards/team \
  -H "Authorization: Bearer $TOKEN"
# Expect: 403 Forbidden
```
