# API Contracts — Auth Routes

## POST /api/auth/login

**Rate Limited**: 10 req/min per IP
**Authentication**: None

**Request**:
```json
{
  "email": "rep@haversack.test",
  "password": "SecurePass1"
}
```

**Response 200**:
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "dGhpcyBpcyBh...",
  "user": {
    "id": "uuid",
    "email": "rep@haversack.test",
    "role": "rep",
    "firstName": "Jane",
    "lastName": "Rep"
  }
}
```

**Response 401**: Invalid credentials
```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid email or password",
  "code": "AUTH_INVALID_CREDENTIALS",
  "requestId": "uuid"
}
```

**Response 429**: Rate limited
```json
{
  "error": "TOO_MANY_REQUESTS",
  "message": "Rate limit exceeded. Try again in 45 seconds",
  "code": "AUTH_RATE_LIMITED",
  "requestId": "uuid"
}
```

## POST /api/auth/refresh

**Authentication**: None (refresh token in body)

**Request**:
```json
{
  "refreshToken": "dGhpcyBpcyBh..."
}
```

**Response 200**:
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "dGhpcyBpcyBh..."
}
```

**Response 401**: Expired or invalid token
```json
{
  "error": "UNAUTHORIZED",
  "message": "Refresh token expired",
  "code": "AUTH_TOKEN_EXPIRED",
  "requestId": "uuid"
}
```

## POST /api/auth/logout

**Authentication**: Bearer token required

**Request**: Empty body

**Response 200**:
```json
{
  "message": "Logged out successfully"
}
```

**Response 401**: Invalid or missing token

## Common Error Responses

**400 Validation Error**:
```json
{
  "error": "BAD_REQUEST",
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "requestId": "uuid",
  "details": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

**403 Forbidden**:
```json
{
  "error": "FORBIDDEN",
  "message": "Insufficient permissions",
  "code": "AUTH_FORBIDDEN",
  "requestId": "uuid"
}
```

**404 Not Found**:
```json
{
  "error": "NOT_FOUND",
  "message": "Route not found",
  "code": "ROUTE_NOT_FOUND",
  "requestId": "uuid"
}
```

**500 Internal Error**:
```json
{
  "error": "INTERNAL_SERVER_ERROR",
  "message": "An unexpected error occurred",
  "code": "INTERNAL_ERROR",
  "requestId": "uuid"
}
```

## Headers

All responses include:
- `X-Request-Id: {uuid}` — Correlation ID matching requestId in error responses
