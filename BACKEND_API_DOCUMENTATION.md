# Backend API Documentation

## Overview

This document provides comprehensive documentation for the Government-Grade Authentication System + Device Management System (DeviceMS) backend API. The API is built with FastAPI and implements production-ready security controls, multi-device session management, and comprehensive audit logging.

**API Base URL (Development):** `http://localhost:8000/api`  
**API Base URL (Production):** `https://auth.production.gov/api`  
**API Documentation:** `/api/docs` (Swagger UI) | `/api/redoc` (ReDoc)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Error Handling](#error-handling)
3. [Rate Limiting](#rate-limiting)
4. [Core Endpoints](#core-endpoints)
5. [Device Management](#device-management)
6. [Sessions & Security](#sessions--security)
7. [Admin Operations](#admin-operations)
8. [Response Formats](#response-formats)

---

## Authentication

### Overview

All endpoints (except `/auth/login` and `/auth/refresh`) require authentication via JWT access tokens. The system uses short-lived access tokens (15 minutes) and long-lived refresh tokens (7 days) for security and convenience.

### Token Management

**Access Token:**
- **Format:** Bearer JWT (RS256 or HS256 signature)
- **Expiration:** 15 minutes
- **Location:** Authorization header
- **Usage:** `Authorization: Bearer <access_token>`

**Refresh Token:**
- **Format:** Opaque token
- **Expiration:** 7 days
- **Location:** HttpOnly, Secure cookie
- **Rotation:** Automatic on each refresh (one-time use)
- **Reuse Detection:** Automatic chain revocation on suspicious reuse

**CSRF Token:**
- **Format:** Random token
- **Location:** `X-CSRF-Token` header (for state-changing operations)
- **Cookie:** `csrf_token` (httpOnly=false to allow JS access)

### Authentication Flow

**Initial Login:**
\`\`\`
1. Client sends credentials → POST /auth/login
2. Server validates credentials + MFA if enabled
3. Server returns:
   - access_token (in response body)
   - refresh_token (in httpOnly cookie)
   - csrf_token (in cookie)
   - user object
4. Client stores access_token in memory (NOT localStorage/sessionStorage)
\`\`\`

**Token Expiration:**
\`\`\`
1. Access token expires (401 response)
2. Client automatically calls POST /auth/refresh
3. Server validates refresh_token from cookie
4. Server returns new access_token
5. Client retries original request
\`\`\`

**Token Refresh (Rotation):**
\`\`\`
1. POST /auth/refresh with old refresh_token
2. Server validates:
   - Token exists in refresh_tokens table
   - Token not already used (reuse detection)
   - Token not expired
   - Token not revoked
3. Server marks old token as used via replaced_by_token_id
4. Server generates new refresh_token
5. Returns new access_token + sets new refresh_token cookie
\`\`\`

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Typical Cause |
|------|---------|---------------|
| **200** | OK | Request successful |
| **201** | Created | Resource created successfully |
| **400** | Bad Request | Invalid input, validation error |
| **401** | Unauthorized | Missing/invalid token, expired token |
| **403** | Forbidden | Insufficient permissions (RBAC) |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Resource already exists |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Unexpected server error |

### Error Response Format

\`\`\`json
{
  "detail": "Error message",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000"
}
\`\`\`

### Common Error Scenarios

**Invalid Credentials:**
\`\`\`
POST /auth/login
Response: 401 Unauthorized
{
  "detail": "Invalid username or password"
}
\`\`\`

**Expired Token:**
\`\`\`
GET /api/users/me
Headers: Authorization: Bearer <expired_token>
Response: 401 Unauthorized
{
  "detail": "Token expired"
}
\`\`\`

**Insufficient Permissions:**
\`\`\`
DELETE /api/users/{user_id}
(caller is not admin)
Response: 403 Forbidden
{
  "detail": "Insufficient permissions"
}
\`\`\`

**Rate Limited:**
\`\`\`
POST /auth/login
(>20 attempts in 1 minute from same IP)
Response: 429 Too Many Requests
{
  "detail": "Rate limit exceeded"
}
\`\`\`

---

## Rate Limiting

### Policies

| Endpoint Group | Limit | Window | Notes |
|---|---|---|---|
| `/auth/login` | 20/minute | Per IP | Protects against brute force |
| `/auth/password/*` | 5/minute | Per IP | Protects reset endpoint |
| Other auth endpoints | 100/minute | Per IP | General protection |
| General API endpoints | 100/minute | Per IP | Default for all endpoints |

### Rate Limit Response

\`\`\`
HTTP/1.1 429 Too Many Requests
{
  "detail": "Rate limit exceeded"
}
\`\`\`

**Headers:**
\`\`\`
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1635451234
\`\`\`

---

## Core Endpoints

### Authentication

#### POST /auth/login

**Description:** Authenticate user with credentials and optional 2FA

**Request:**
\`\`\`json
{
  "username": "john.doe",
  "password": "SecurePass123!",
  "device_id": "91ad55e8009b8b03"  // Optional, for device tracking
}
\`\`\`

**Response (No 2FA):**
\`\`\`json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "3c93b4c8-7a26-438c-a66e-9de45b4072c9",
    "username": "john.doe",
    "email": "john@example.com",
    "role": "user",
    "first_name": "John",
    "last_name": "Doe",
    "is_verified": true
  },
  "session_id": "64f38117-81f3-4fbc-a205-0eabb72d750d"
}
\`\`\`

**Cookies Set:**
\`\`\`
Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
Set-Cookie: csrf_token=...; Secure; SameSite=Strict; Max-Age=604800
\`\`\`

**Response (2FA Required):**
\`\`\`json
{
  "requires_mfa": true,
  "temp_token": "eyJhbGciOiJIUzI1NiIs...",
  "message": "Please verify your authenticator code"
}
\`\`\`

**Status Codes:**
- `200` - Login successful
- `400` - Invalid credentials / account locked
- `401` - Invalid credentials
- `429` - Too many login attempts

---

#### POST /auth/refresh

**Description:** Refresh expired access token using refresh token (automatic token rotation)

**Request:**
\`\`\`
Headers:
  X-Session-Id: 64f38117-81f3-4fbc-a205-0eabb72d750d
  X-CSRF-Token: csrf_token_value

Cookies:
  refresh_token=...
\`\`\`

**Response:**
\`\`\`json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "bearer"
}
\`\`\`

**New Cookies Set:**
\`\`\`
Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
\`\`\`

**Status Codes:**
- `200` - Token refreshed successfully
- `401` - Refresh token invalid/expired/revoked
- `401` - Token reuse detected (entire token chain revoked)

---

#### POST /auth/logout

**Description:** Logout user, invalidate current session and refresh token

**Request:**
\`\`\`
Headers:
  Authorization: Bearer <access_token>
  X-CSRF-Token: csrf_token_value
\`\`\`

**Response:**
\`\`\`json
{
  "message": "Logged out successfully"
}
\`\`\`

**Cookies Cleared:**
\`\`\`
Set-Cookie: refresh_token=; Max-Age=0
Set-Cookie: csrf_token=; Max-Age=0
\`\`\`

**Status Codes:**
- `200` - Logout successful
- `401` - Invalid token

---

#### GET /auth/me

**Description:** Get current authenticated user's profile

**Request:**
\`\`\`
Headers:
  Authorization: Bearer <access_token>
\`\`\`

**Response:**
\`\`\`json
{
  "id": "3c93b4c8-7a26-438c-a66e-9de45b4072c9",
  "username": "john.doe",
  "email": "john@example.com",
  "role": "user",
  "first_name": "John",
  "last_name": "Doe",
  "department": "Operations",
  "personal_number": "12345",
  "is_active": true,
  "is_verified": true,
  "two_factor_auth": false,
  "email_notifications": true,
  "device_alerts": true,
  "security_alerts": true,
  "maintenance_alerts": false,
  "created_at": "2025-10-15T10:30:00Z",
  "last_login": "2025-10-18T14:22:15Z"
}
\`\`\`

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

---

### Multi-Factor Authentication (MFA)

#### POST /auth/mfa/enable

**Description:** Enable 2FA (TOTP) for current user

**Request:**
\`\`\`
Headers:
  Authorization: Bearer <access_token>
  X-CSRF-Token: csrf_token_value

No body
\`\`\`

**Response:**
\`\`\`json
{
  "qr_code": "data:image/svg+xml;...",
  "secret": "JBSWY3DPEBLW64TMMQ======",
  "backup_codes": [
    "123456-abcdef",
    "234567-bcdefg",
    "345678-cdefgh",
    ...
  ],
  "message": "Scan QR code with authenticator app"
}
\`\`\`

**Instructions:**
1. Client displays QR code to user
2. User scans with authenticator app (Google Authenticator, Microsoft Authenticator, etc.)
3. User verifies code with `POST /auth/mfa/verify`

---

#### POST /auth/mfa/verify

**Description:** Verify 2FA code during setup or login

**Request (During Setup):**
\`\`\`json
{
  "totp_code": "123456"
}
\`\`\`

**Request (During Login with 2FA):**
\`\`\`json
{
  "temp_token": "eyJhbGciOiJIUzI1NiIs...",
  "totp_code": "123456"
}
\`\`\`

**Response:**
\`\`\`json
{
  "message": "2FA enabled successfully",
  "access_token": "eyJhbGciOiJSUzI1NiIs...",  // Only during login
  "user": {...}  // Only during login
}
\`\`\`

**Status Codes:**
- `200` - Verification successful
- `400` - Invalid TOTP code
- `401` - Temp token expired/invalid

---

#### POST /auth/mfa/disable

**Description:** Disable 2FA for current user

**Request:**
\`\`\`
Headers:
  Authorization: Bearer <access_token>
  X-CSRF-Token: csrf_token_value
\`\`\`

**Response:**
\`\`\`json
{
  "message": "2FA disabled successfully"
}
\`\`\`

**Status Codes:**
- `200` - Disabled successfully
- `401` - Unauthorized

---

### Password Management

#### POST /auth/password/change

**Description:** Change current user's password

**Request:**
\`\`\`json
{
  "current_password": "OldPassword123!",
  "new_password": "NewPassword456!"
}
\`\`\`

**Response:**
\`\`\`json
{
  "message": "Password changed successfully",
  "password_changed_at": "2025-10-18T15:45:00Z"
}
\`\`\`

**Validation Rules:**
- Minimum 12 characters
- Must contain uppercase, lowercase, numbers, special characters
- Cannot match previous password
- Cannot be in common password blocklist

---

#### POST /auth/password/reset/request

**Description:** Request password reset (sends email)

**Request:**
\`\`\`json
{
  "email": "john@example.com"
}
\`\`\`

**Response:**
\`\`\`json
{
  "message": "If email exists, password reset link has been sent"
}
\`\`\`

**Note:** Always returns 200 for security (prevents email enumeration)

---

#### POST /auth/password/reset/confirm

**Description:** Confirm password reset with token

**Request:**
\`\`\`json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "new_password": "NewPassword456!"
}
\`\`\`

**Response:**
\`\`\`json
{
  "message": "Password reset successfully"
}
\`\`\`

**Status Codes:**
- `200` - Success
- `400` - Invalid/expired token

---

## Sessions & Security

### GET /api/auth/sessions

**Description:** Get all active sessions for current user

**Request:**
\`\`\`
Headers:
  Authorization: Bearer <access_token>
\`\`\`

**Response:**
\`\`\`json
[
  {
    "id": "64f38117-81f3-4fbc-a205-0eabb72d750d",
    "device_name": "Chrome on Linux",
    "device_type": "desktop",
    "browser": "Chrome",
    "browser_version": "141.0.0.0",
    "os": "Linux",
    "os_version": "Unknown",
    "ip_address": "192.168.1.100",
    "created_at": "2025-10-18T10:00:00Z",
    "last_activity": "2025-10-18T15:45:00Z",
    "is_current": true,
    "expires_at": "2025-10-25T10:00:00Z"
  },
  {
    "id": "75f48228-92g4-5gcd-b316-557766551g1e",
    "device_name": "Safari on iOS",
    "device_type": "mobile",
    "browser": "Safari",
    "browser_version": "18.0",
    "os": "iOS",
    "os_version": "18.0",
    "ip_address": "203.0.113.45",
    "created_at": "2025-10-17T14:20:00Z",
    "last_activity": "2025-10-18T12:10:00Z",
    "is_current": false,
    "expires_at": "2025-10-24T14:20:00Z"
  }
]
\`\`\`

---

### DELETE /api/auth/sessions/{session_id}

**Description:** Revoke a specific session (logout from specific device)

**Request:**
\`\`\`
Headers:
  Authorization: Bearer <access_token>
  X-CSRF-Token: csrf_token_value
\`\`\`

**Response:**
\`\`\`json
{
  "message": "Session revoked successfully"
}
\`\`\`

**Status Codes:**
- `200` - Session revoked
- `404` - Session not found or doesn't belong to user
- `400` - Cannot revoke current session

---

### DELETE /api/auth/sessions/all

**Description:** Revoke all sessions except current (logout from all devices)

**Request:**
\`\`\`
Headers:
  Authorization: Bearer <access_token>
  X-CSRF-Token: csrf_token_value
\`\`\`

**Response:**
\`\`\`json
{
  "message": "All other sessions revoked successfully",
  "sessions_revoked": 3
}
\`\`\`

---

## Device Management

### Buildings

#### GET /api/buildings

**Description:** Get all buildings (with pagination and filtering)

**Query Parameters:**
\`\`\`
?page=1&limit=10&search=name&sort=created_at&order=desc
\`\`\`

**Response:**
\`\`\`json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Main Office Building",
      "code": "BLD-001",
      "description": "Primary office location",
      "location": "123 Main St, Downtown",
      "value": 5000000,
      "condition": "good",
      "year_built": 2015,
      "created_at": "2025-10-01T08:00:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 10
}
\`\`\`

#### POST /api/buildings

**Description:** Create a new building (admin only)

**Request:**
\`\`\`json
{
  "name": "New Office Building",
  "code": "BLD-002",
  "description": "Secondary office location",
  "location": "456 Oak Ave, Suburbs",
  "value": 3000000,
  "condition": "excellent",
  "year_built": 2020
}
\`\`\`

---

### Vehicles

#### GET /api/vehicles
#### POST /api/vehicles
#### GET /api/vehicles/{vehicle_id}
#### PUT /api/vehicles/{vehicle_id}
#### DELETE /api/vehicles/{vehicle_id}

Similar patterns as Buildings. Device endpoints include:
- **Condition tracking:** excellent, good, fair, poor, non-functional
- **Depreciation calculations:** Automatic based on acquisition date
- **Transfer history:** Track device movements between users/departments
- **Maintenance logs:** Record service records

---

## Admin Operations

### User Management

#### GET /api/users

**Description:** Get all users (admin only)

**Response:**
\`\`\`json
[
  {
    "id": "3c93b4c8-7a26-438c-a66e-9de45b4072c9",
    "username": "john.doe",
    "email": "john@example.com",
    "role": "user",
    "is_active": true,
    "is_verified": true,
    "last_login": "2025-10-18T14:22:15Z",
    "created_at": "2025-10-01T08:00:00Z"
  }
]
\`\`\`

#### POST /api/users

**Description:** Create new user (admin only)

**Request:**
\`\`\`json
{
  "username": "jane.smith",
  "email": "jane@example.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "role": "user",
  "department": "Finance",
  "personal_number": "54321"
}
\`\`\`

#### DELETE /api/users/{user_id}

**Description:** Delete user (admin only)

---

### Audit Logs

#### GET /api/audit-logs

**Description:** Query audit logs (admin only)

**Query Parameters:**
\`\`\`
?page=1&limit=50&action=LOGIN&entity_type=user&user_id=xxx&start_date=2025-10-01&end_date=2025-10-31
\`\`\`

**Response:**
\`\`\`json
{
  "items": [
    {
      "id": "audit-123",
      "user_id": "3c93b4c8-7a26-438c-a66e-9de45b4072c9",
      "username": "john.doe",
      "action": "LOGIN",
      "entity_type": "user",
      "entity_id": "3c93b4c8-7a26-438c-a66e-9de45b4072c9",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "status": "success",
      "timestamp": "2025-10-18T14:22:15Z"
    }
  ],
  "total": 1250
}
\`\`\`

---

## Response Formats

### Standard Success Response

\`\`\`json
{
  "data": {
    ...
  },
  "message": "Operation successful",
  "timestamp": "2025-10-18T15:45:00Z",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000"
}
\`\`\`

### Paginated Response

\`\`\`json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "pages": 10,
  "has_next": true,
  "has_prev": false
}
\`\`\`

### Error Response

\`\`\`json
{
  "detail": "Error message",
  "error_code": "VALIDATION_ERROR",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000"
}
\`\`\`

---

## Request Headers

**Required for all authenticated requests:**
\`\`\`
Authorization: Bearer <access_token>
Content-Type: application/json
X-Correlation-ID: <optional-correlation-id>
\`\`\`

**Required for state-changing operations (POST, PUT, PATCH, DELETE):**
\`\`\`
X-CSRF-Token: <csrf_token_from_cookie>
\`\`\`

---

## CORS & Security

### CORS Headers (Responses)

\`\`\`
Access-Control-Allow-Origin: https://auth.production.gov (configurable)
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, X-CSRF-Token, X-Correlation-ID
\`\`\`

### Security Headers (All Responses)

\`\`\`
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
\`\`\`

---

## Webhooks & Events (Optional)

The system publishes real-time events via Redis pub/sub:

**Channel: `session:terminated:{user_id}`**
\`\`\`json
{
  "type": "session_terminated",
  "user_id": "3c93b4c8-7a26-438c-a66e-9de45b4072c9",
  "session_id": "64f38117-81f3-4fbc-a205-0eabb72d750d",
  "terminated_by": "admin",
  "timestamp": "2025-10-18T15:45:00Z"
}
\`\`\`

**Channel: `token:reuse_detected:{user_id}`**
\`\`\`json
{
  "type": "token_reuse_detected",
  "user_id": "3c93b4c8-7a26-438c-a66e-9de45b4072c9",
  "ip_address": "203.0.113.45",
  "timestamp": "2025-10-18T15:45:00Z"
}
\`\`\`

---

## Code Examples

### JavaScript/Fetch

\`\`\`javascript
// Login
const response = await fetch('https://api.auth.gov/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',  // Important: send cookies
  body: JSON.stringify({
    username: 'john.doe',
    password: 'SecurePass123!'
  })
});

const { access_token } = await response.json();

// Subsequent requests
const userResponse = await fetch('https://api.auth.gov/auth/me', {
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'X-CSRF-Token': getCsrfToken()
  },
  credentials: 'include'
});
\`\`\`

### Python/Requests

\`\`\`python
import requests

session = requests.Session()

# Login
response = session.post('https://api.auth.gov/auth/login', json={
    'username': 'john.doe',
    'password': 'SecurePass123!'
})
data = response.json()
access_token = data['access_token']

# Subsequent requests
headers = {
    'Authorization': f'Bearer {access_token}',
    'X-CSRF-Token': session.cookies.get('csrf_token')
}
response = session.get('https://api.auth.gov/auth/me', headers=headers)
\`\`\`

---

## Troubleshooting

### "Token Expired" (401)

**Cause:** Access token has exceeded 15-minute lifetime
**Solution:** Frontend should automatically call `/auth/refresh` and retry

### "Invalid CSRF Token" (400)

**Cause:** CSRF token missing or mismatched
**Solution:** Ensure `X-CSRF-Token` header matches cookie value

### "Session Not Found" (401)

**Cause:** Session invalidated or session ID header mismatch
**Solution:** User needs to re-authenticate

### "Rate Limit Exceeded" (429)

**Cause:** Too many requests in time window
**Solution:** Wait before retrying (see RateLimit-Reset header)

---

## Support & Contact

For API issues, check logs and correlation ID in response headers. Contact the backend team with correlation ID for debugging.
