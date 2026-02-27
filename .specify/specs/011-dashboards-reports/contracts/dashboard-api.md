# Dashboard API Contracts

## GET /api/dashboards/rep

**Auth:** authenticate (any authenticated user)
**RBAC:** Data scoped to requesting user's territory

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| period | enum | No | current_month | One of: current_month, last_month, current_quarter, last_quarter, ytd, trailing_12_months, custom |
| start_date | string (ISO date) | No | - | Required when period=custom |
| end_date | string (ISO date) | No | - | Required when period=custom |

**Response 200:**
```json
{
  "data": {
    "revenue": {
      "currentMonth": 45200.50,
      "trailing12Months": 523000.00
    },
    "activities": {
      "currentMonthCount": 47
    },
    "opportunities": {
      "openCount": 12,
      "weightedPipelineValue": 185000.00
    },
    "commissions": {
      "currentMonth": 3800.25,
      "ytd": 28500.00
    },
    "accountHealth": {
      "healthy": 15,
      "atRisk": 5,
      "critical": 3
    },
    "hasData": true,
    "period": { "start": "2026-02-01", "end": "2026-02-28" }
  }
}
```

---

## GET /api/dashboards/rep/critical-accounts

**Auth:** authenticate
**RBAC:** Scoped to requesting user's territory

**Response 200:**
```json
{
  "data": [
    { "id": "uuid", "name": "Account Name", "healthScore": 28, "territory": "Portland Metro" }
  ],
  "count": 3
}
```

---

## GET /api/dashboards/team

**Auth:** authenticate + authorize('manager')

**Query Parameters:** Same as rep dashboard (period, start_date, end_date)

**Response 200:**
```json
{
  "data": {
    "repRankings": [
      {
        "repId": "uuid",
        "repName": "Jane Smith",
        "isActive": true,
        "revenue": 45200.50,
        "orderCount": 23,
        "activityCount": 47,
        "pipelineValue": 185000.00
      }
    ],
    "totals": {
      "totalRevenue": 380000.00,
      "totalOrders": 156,
      "totalActivities": 312,
      "totalPipelineValue": 1200000.00,
      "activeRepCount": 9
    },
    "hasData": true,
    "period": { "start": "2026-02-01", "end": "2026-02-28" }
  }
}
```

---

## GET /api/dashboards/team/revenue-by-month

**Auth:** authenticate + authorize('manager')

**Query Parameters:**
| Param | Type | Required | Default |
|-------|------|----------|---------|
| months | number | No | 12 | Number of trailing months (1-24) |

**Response 200:**
```json
{
  "data": [
    { "month": "2025-03", "revenue": 42000.00 },
    { "month": "2025-04", "revenue": 48500.00 }
  ]
}
```

---

## GET /api/dashboards/team/pipeline-forecast

**Auth:** authenticate + authorize('manager')

**Response 200:**
```json
{
  "data": {
    "stages": [
      { "stage": "prospect", "count": 15, "totalValue": 300000, "weightedValue": 30000 },
      { "stage": "qualified", "count": 8, "totalValue": 200000, "weightedValue": 80000 }
    ],
    "totalWeightedForecast": 450000.00,
    "totalOpenValue": 1200000.00
  }
}
```

---

## GET /api/dashboards/team/territory-revenue

**Auth:** authenticate + authorize('manager')

**Query Parameters:** period, start_date, end_date (same as team dashboard)

**Response 200:**
```json
{
  "data": [
    { "territoryId": "uuid", "territoryName": "Portland Metro", "revenue": 120000.00, "orderCount": 45, "accountCount": 22 }
  ]
}
```
