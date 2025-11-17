# Government-Grade Authentication System Architecture

## System Overview

This system implements a production-ready, government-grade authentication system with defense-in-depth security controls suitable for high-sensitivity environments.

**Technology Stack:**
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL 15+
- **Transport:** HTTPS only (TLS 1.3)
- **Session Management:** HttpOnly, Secure, SameSite=Strict cookies

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                          │
│  ┌────────────────┐                    ┌──────────────────┐    │
│  │  Login Page    │◄──────────────────►│   Dashboard      │    │
│  │  (React/TS)    │                    │   (Protected)    │    │
│  └────────────────┘                    └──────────────────┘    │
│         │                                        │              │
│         │ HTTPS + Cookies (HttpOnly, Secure)    │              │
└─────────┼────────────────────────────────────────┼──────────────┘
          │                                        │
          ▼                                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 Security Middleware                       │  │
│  │  • CORS (strict allowlist)  • Rate Limiting              │  │
│  │  • CSRF Protection          • Brute Force Prevention     │  │
│  │  • HSTS, CSP Headers        • Audit Logging              │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Authentication Endpoints                     │  │
│  │  POST /auth/login       POST /auth/refresh               │  │
│  │  POST /auth/logout      POST /auth/password/change       │  │
│  │  POST /auth/mfa/enable  POST /auth/mfa/verify            │  │
│  │  GET  /auth/me          GET  /auth/sessions              │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  RBAC Middleware                          │  │
│  │  • Role-based access control                             │  │
│  │  • Permission checking                                    │  │
│  │  • Least privilege enforcement                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────┬───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                          │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   users    │  │refresh_tokens│  │   audit_logs         │   │
│  │   roles    │  │   sessions   │  │failed_login_attempts │   │
│  │permissions │  │ mfa_secrets  │  │                      │   │
│  └────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication Flow Sequence Diagrams

### 1. Initial Login Flow (Without 2FA)

```
Client              Frontend            Backend              Database
  │                    │                   │                     │
  │  Enter Creds      │                   │                     │
  ├──────────────────►│                   │                     │
  │                    │ POST /auth/login  │                     │
  │                    ├──────────────────►│                     │
  │                    │  {email, password}│ Validate Creds     │
  │                    │                   ├────────────────────►│
  │                    │                   │                     │
  │                    │                   │◄────────────────────┤
  │                    │                   │  User + Password    │
  │                    │                   │  Hash Match         │
  │                    │                   │                     │
  │                    │                   │ Generate Tokens     │
  │                    │                   │ (Access + Refresh)  │
  │                    │                   │                     │
  │                    │                   │ Store Refresh Token │
  │                    │                   ├────────────────────►│
  │                    │                   │                     │
  │                    │                   │ Log Login Success   │
  │                    │                   ├────────────────────►│
  │                    │◄──────────────────┤                     │
  │                    │ Set-Cookie:       │                     │
  │                    │  refresh_token    │                     │
  │                    │  (HttpOnly,Secure)│                     │
  │                    │ Set-Cookie:       │                     │
  │                    │  csrf_token       │                     │
  │                    │ Body: {           │                     │
  │                    │  access_token,    │                     │
  │                    │  user {...}       │                     │
  │                    │ }                 │                     │
  │◄───────────────────┤                   │                     │
  │  Store access_token│                   │                     │
  │  in memory only    │                   │                     │
  │  Redirect to /dash │                   │                     │
  │                    │                   │                     │
```

### 2. Login Flow With 2FA (TOTP)

```
Client              Frontend            Backend              Database
  │                    │                   │                     │
  │  Enter Creds      │                   │                     │
  ├──────────────────►│                   │                     │
  │                    │ POST /auth/login  │                     │
  │                    ├──────────────────►│                     │
  │                    │  {email, password}│ Validate Creds     │
  │                    │                   ├────────────────────►│
  │                    │                   │◄────────────────────┤
  │                    │                   │ User has MFA enabled│
  │                    │◄──────────────────┤                     │
  │                    │ 200 OK            │                     │
  │                    │ {requires_mfa:true│                     │
  │                    │  temp_token: ...} │                     │
  │◄───────────────────┤                   │                     │
  │  Show TOTP Input  │                   │                     │
  ├──────────────────►│                   │                     │
  │  Enter TOTP Code  │                   │                     │
  │                    │POST /auth/mfa/verify                    │
  │                    ├──────────────────►│                     │
  │                    │{temp_token, totp} │ Verify TOTP        │
  │                    │                   ├────────────────────►│
  │                    │                   │◄────────────────────┤
  │                    │                   │ TOTP Valid          │
  │                    │                   │                     │
  │                    │                   │ Generate Tokens     │
  │                    │                   │ Store Refresh Token │
  │                    │                   ├────────────────────►│
  │                    │◄──────────────────┤                     │
  │                    │ Set-Cookie + Tokens                     │
  │◄───────────────────┤                   │                     │
  │  Redirect to /dash │                   │                     │
```

### 3. Access Token Refresh Flow (Token Rotation)

```
Client              Frontend            Backend              Database
  │                    │                   │                     │
  │  API Request       │                   │                     │
  ├──────────────────►│                   │                     │
  │                    │ GET /api/resource │                     │
  │                    ├──────────────────►│                     │
  │                    │ Authorization:    │                     │
  │                    │  Bearer <expired> │                     │
  │                    │◄──────────────────┤                     │
  │                    │ 401 Unauthorized  │                     │
  │◄───────────────────┤                   │                     │
  │                    │                   │                     │
  │                    │POST /auth/refresh │                     │
  │                    ├──────────────────►│                     │
  │                    │ Cookie: refresh_  │ Validate Refresh    │
  │                    │   token + csrf    │ Token               │
  │                    │                   ├────────────────────►│
  │                    │                   │◄────────────────────┤
  │                    │                   │ Token Valid         │
  │                    │                   │                     │
  │                    │                   │ Mark Old Token Used │
  │                    │                   │ Generate New Tokens │
  │                    │                   ├────────────────────►│
  │                    │                   │                     │
  │                    │                   │ Log Token Rotation  │
  │                    │                   ├────────────────────►│
  │                    │◄──────────────────┤                     │
  │                    │ Set-Cookie: new   │                     │
  │                    │  refresh_token    │                     │
  │                    │ Body: {           │                     │
  │                    │  access_token     │                     │
  │                    │ }                 │                     │
  │◄───────────────────┤                   │                     │
  │  Store new access  │                   │                     │
  │  Retry original req│                   │                     │
```

### 4. Refresh Token Reuse Detection (Security)

```
Attacker            Backend              Database
  │                    │                     │
  │ POST /auth/refresh │                     │
  ├───────────────────►│                     │
  │ Cookie: old_refresh│ Check Token         │
  │   (already used)   ├────────────────────►│
  │                    │◄────────────────────┤
  │                    │ Token already used! │
  │                    │ (replaced_by exists)│
  │                    │                     │
  │                    │ SECURITY EVENT:     │
  │                    │ Revoke entire chain │
  │                    ├────────────────────►│
  │                    │ DELETE all tokens   │
  │                    │ for this user       │
  │                    │                     │
  │                    │ Log Security Event  │
  │                    ├────────────────────►│
  │◄───────────────────┤                     │
  │ 401 Unauthorized   │ Alert Admin         │
  │ Session Invalid    │                     │
```

### 5. Session Revocation Flow

```
User (Device A)     Frontend            Backend              Database
  │                    │                   │                     │
  │ View Sessions      │                   │                     │
  ├──────────────────►│                   │                     │
  │                    │ GET /auth/sessions│                     │
  │                    ├──────────────────►│                     │
  │                    │ Authorization:    │                     │
  │                    │  Bearer <token>   │ Get User Sessions   │
  │                    │                   ├────────────────────►│
  │                    │                   │◄────────────────────┤
  │                    │◄──────────────────┤ [{session1,session2}│
  │◄───────────────────┤                   │                     │
  │ Show Sessions:     │                   │                     │
  │ - Device B (Chrome)│                   │                     │
  │ - Device C (Mobile)│                   │                     │
  │                    │                   │                     │
  │ Revoke Device B    │                   │                     │
  ├──────────────────►│                   │                     │
  │                    │DELETE /auth/      │                     │
  │                    │  sessions/:id     │                     │
  │                    ├──────────────────►│                     │
  │                    │ X-CSRF-Token      │ Mark Revoked        │
  │                    │                   ├────────────────────►│
  │                    │                   │ UPDATE revoked=true │
  │                    │                   │                     │
  │                    │                   │ Log Revocation      │
  │                    │                   ├────────────────────►│
  │                    │◄──────────────────┤                     │
  │◄───────────────────┤ 200 OK            │                     │
  │                    │                   │                     │

User (Device B)         Backend              Database
  │                        │                     │
  │ Next API Call          │                     │
  ├───────────────────────►│                     │
  │ Cookie: refresh_token  │ Check Token         │
  │                        ├────────────────────►│
  │                        │◄────────────────────┤
  │                        │ Token revoked!      │
  │◄───────────────────────┤                     │
  │ 401 Unauthorized       │                     │
  │ Redirect to Login      │                     │
```

## Security Controls Implemented

### Transport Security
- **TLS 1.3 Only:** All communications over HTTPS
- **HSTS:** Strict-Transport-Security header with max-age=31536000
- **Certificate Pinning:** Recommended for mobile apps

### Authentication Security
- **Password Hashing:** Argon2id with tuned parameters (time=3, memory=65536, parallelism=4)
- **Password Policy:** Minimum 12 characters, complexity requirements, common password blocklist
- **Account Lockout:** Progressive lockout after 5 failed attempts (5min → 15min → 1hr → 24hr)
- **Rate Limiting:** Per-IP (100/min) and per-user (20/min) limits on auth endpoints
- **Brute Force Protection:** Exponential backoff on failed attempts

### Session Management
- **Short-lived Access Tokens:** JWT with 15-minute expiration
- **Rotating Refresh Tokens:** One-time use, 7-day expiration, automatic rotation
- **Token Reuse Detection:** Automatic revocation of entire token chain on reuse
- **Session Binding:** Device fingerprinting (IP + User-Agent)
- **HttpOnly Cookies:** Refresh tokens never accessible to JavaScript
- **Secure Flag:** Cookies only sent over HTTPS
- **SameSite=Strict:** CSRF protection at cookie level

### Multi-Factor Authentication
- **TOTP (RFC 6238):** Time-based one-time passwords
- **Backup Codes:** 10 single-use recovery codes (bcrypt hashed)
- **QR Code Generation:** For authenticator app setup
- **Optional/Enforced:** Configurable per-user or role

### CSRF Protection
- **Double-Submit Cookie:** CSRF token in cookie + header validation
- **SameSite Cookies:** Primary defense layer
- **State-Changing Endpoints:** All require CSRF token validation

### Authorization (RBAC)
- **Role-Based Access Control:** Hierarchical roles (Admin, User, Guest)
- **Fine-Grained Permissions:** Granular permission checks
- **Least Privilege:** Default deny, explicit allow
- **Permission Caching:** Redis-backed for performance

### Audit & Monitoring
- **Structured Logging:** JSON logs with correlation IDs
- **Audit Events:** All auth events logged (login, logout, token rotation, MFA, password change)
- **PII Protection:** No passwords or tokens in logs
- **SIEM Integration:** Log format compatible with Splunk, ELK, Datadog
- **Alerting:** Failed login thresholds, token reuse detection, MFA failures

### Application Security
- **CORS:** Strict allowlist of origins from environment variables
- **CSP:** Content-Security-Policy header restricting script sources
- **X-Frame-Options:** DENY to prevent clickjacking
- **X-Content-Type-Options:** nosniff
- **Referrer-Policy:** strict-origin-when-cross-origin
- **Input Validation:** Pydantic models with strict validation
- **SQL Injection Prevention:** SQLAlchemy ORM with parameterized queries
- **XSS Prevention:** Output encoding, CSP

## Database Schema

### users
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
email           VARCHAR(255) UNIQUE NOT NULL
username        VARCHAR(100) UNIQUE NOT NULL
password_hash   VARCHAR(255) NOT NULL
is_active       BOOLEAN DEFAULT true
is_verified     BOOLEAN DEFAULT false
role_id         UUID REFERENCES roles(id)
failed_attempts INTEGER DEFAULT 0
locked_until    TIMESTAMP NULL
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

### roles
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
name        VARCHAR(50) UNIQUE NOT NULL
description TEXT
created_at  TIMESTAMP DEFAULT NOW()
```

### permissions
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
code        VARCHAR(100) UNIQUE NOT NULL
description TEXT
created_at  TIMESTAMP DEFAULT NOW()
```

### role_permissions
```sql
role_id       UUID REFERENCES roles(id) ON DELETE CASCADE
permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE
PRIMARY KEY (role_id, permission_id)
```

### refresh_tokens
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id             UUID REFERENCES users(id) ON DELETE CASCADE
token_hash          VARCHAR(255) UNIQUE NOT NULL
issued_at           TIMESTAMP DEFAULT NOW()
expires_at          TIMESTAMP NOT NULL
revoked             BOOLEAN DEFAULT false
device_info         JSONB
replaced_by_token_id UUID REFERENCES refresh_tokens(id) NULL
```

### sessions
```sql
id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id          UUID REFERENCES users(id) ON DELETE CASCADE
refresh_token_id UUID REFERENCES refresh_tokens(id) ON DELETE CASCADE
ip_address       INET
user_agent       TEXT
created_at       TIMESTAMP DEFAULT NOW()
last_seen        TIMESTAMP DEFAULT NOW()
```

### audit_logs
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID REFERENCES users(id) ON DELETE SET NULL
event_type  VARCHAR(100) NOT NULL
event_data  JSONB
ip_address  INET
user_agent  TEXT
created_at  TIMESTAMP DEFAULT NOW()
```

### failed_login_attempts
```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id      UUID REFERENCES users(id) ON DELETE CASCADE NULL
username     VARCHAR(255)
ip_address   INET NOT NULL
attempted_at TIMESTAMP DEFAULT NOW()
```

### mfa_secrets
```sql
user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
secret_encrypted  TEXT NOT NULL
backup_codes      TEXT[] NOT NULL
enabled           BOOLEAN DEFAULT false
created_at        TIMESTAMP DEFAULT NOW()
verified_at       TIMESTAMP NULL
```

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://authuser:securepassword@postgres:5432/authdb

# JWT Configuration
JWT_ALGORITHM=RS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_PRIVATE_KEY_PATH=/app/secrets/jwt_private.pem
JWT_PUBLIC_KEY_PATH=/app/secrets/jwt_public.pem

# Refresh Token
REFRESH_TOKEN_EXPIRE_DAYS=7
REFRESH_TOKEN_SIGNING_KEY=<cryptographically-secure-random-key>

# Argon2 Parameters
ARGON2_TIME_COST=3
ARGON2_MEMORY_COST=65536
ARGON2_PARALLELISM=4

# CORS
CORS_ORIGINS=https://dev.auth.local:3000,https://auth.production.gov

# Security
CSRF_SECRET_KEY=<cryptographically-secure-random-key>
SESSION_SECRET_KEY=<cryptographically-secure-random-key>

# Rate Limiting
RATE_LIMIT_PER_IP=100
RATE_LIMIT_PER_USER=20

# MFA
MFA_ISSUER_NAME=GovernmentAuthSystem

# Development
ENV=development
DEV_DOMAIN=dev.auth.local
DEV_FRONTEND_DOMAIN=dev.frontend.local
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration (optional, may be admin-only)
- `POST /api/v1/auth/login` - Login with username/email + password
- `POST /api/v1/auth/refresh` - Rotate refresh token, get new access token
- `POST /api/v1/auth/logout` - Logout, revoke current session
- `POST /api/v1/auth/password/change` - Change password (authenticated)
- `POST /api/v1/auth/password/reset/request` - Request password reset
- `POST /api/v1/auth/password/reset/confirm` - Confirm password reset with token

### Multi-Factor Authentication
- `POST /api/v1/auth/mfa/enable` - Enable MFA, get QR code + backup codes
- `POST /api/v1/auth/mfa/verify` - Verify TOTP during setup or login
- `POST /api/v1/auth/mfa/disable` - Disable MFA (requires password + TOTP)
- `POST /api/v1/auth/mfa/backup-code` - Use backup code for login

### Session Management
- `GET /api/v1/auth/sessions` - List active sessions for current user
- `DELETE /api/v1/auth/sessions/:id` - Revoke specific session
- `DELETE /api/v1/auth/sessions/all` - Revoke all sessions except current

### User Profile
- `GET /api/v1/auth/me` - Get current user profile, roles, permissions
- `PATCH /api/v1/auth/me` - Update profile information

### Admin Endpoints (Requires admin role)
- `GET /api/v1/admin/users` - List all users
- `GET /api/v1/admin/users/:id` - Get user details
- `PATCH /api/v1/admin/users/:id` - Update user (role, active status)
- `DELETE /api/v1/admin/users/:id/sessions` - Revoke all sessions for user
- `GET /api/v1/admin/audit-logs` - Query audit logs
- `GET /api/v1/admin/failed-attempts` - View failed login attempts

## Deployment Architecture

### Development (Local)
```
Docker Compose:
├── PostgreSQL Container (port 5432)
├── FastAPI Container (port 8000)
└── Nginx Container (port 443) - HTTPS proxy with self-signed cert

/etc/hosts:
127.0.0.1  dev.auth.local
127.0.0.1  dev.frontend.local
```

### Production (Kubernetes - Recommended)
```
┌─────────────────────────────────────────────┐
│         Ingress Controller (TLS)            │
│         (cert-manager for Let's Encrypt)    │
└─────────────────┬───────────────────────────┘
                  │
    ┌─────────────┴──────────────┐
    │                            │
    ▼                            ▼
┌─────────┐                 ┌──────────┐
│ Frontend│                 │  FastAPI │
│ Service │                 │  Service │
│ (Static)│                 │  (3+ pods│
└─────────┘                 │   + HPA) │
                            └─────┬────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   PostgreSQL     │
                         │   (StatefulSet)  │
                         │   + Backups      │
                         └──────────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  Secrets Manager │
                         │  (Vault/AWS SM)  │
                         └──────────────────┘
```

## Security Checklist

- [ ] All communications use HTTPS/TLS 1.3
- [ ] HttpOnly, Secure, SameSite=Strict cookies configured
- [ ] Argon2id password hashing implemented
- [ ] Password policy enforced (≥12 chars, complexity, blocklist)
- [ ] Account lockout after failed attempts
- [ ] Rate limiting on all auth endpoints
- [ ] Refresh token rotation implemented
- [ ] Token reuse detection active
- [ ] CSRF protection on state-changing endpoints
- [ ] CORS allowlist configured
- [ ] Security headers set (HSTS, CSP, X-Frame-Options, etc.)
- [ ] MFA/TOTP implementation tested
- [ ] Backup codes generated and hashed
- [ ] RBAC middleware enforcing permissions
- [ ] Audit logging for all auth events
- [ ] No secrets in source code or logs
- [ ] Database uses least-privilege service accounts
- [ ] SQL injection prevention via ORM
- [ ] Input validation on all endpoints
- [ ] Output encoding for XSS prevention
- [ ] Dependency scanning (Dependabot/Snyk) configured
- [ ] Container scanning in CI/CD
- [ ] Secrets managed via Vault/Secrets Manager
- [ ] Database backups automated and tested
- [ ] Incident response runbook documented
- [ ] Monitoring and alerting configured

## Incident Response Runbook

### Suspected Token Theft
1. Identify affected user from audit logs
2. Revoke all sessions: `DELETE /admin/users/:id/sessions`
3. Force password reset
4. Review audit logs for unauthorized access
5. Check for data exfiltration
6. Document in incident report

### Brute Force Attack Detected
1. Check failed_login_attempts table for patterns
2. Block offending IPs at firewall/WAF level
3. Verify account lockout is functioning
4. Review rate limiting effectiveness
5. Consider reducing rate limits temporarily
6. Alert security team

### Token Reuse Detected
1. Review audit logs for `token_reuse_detected` events
2. Affected user sessions automatically revoked
3. Notify user via email
4. Force password reset if suspicious activity
5. Review access logs for affected period
6. Document timeline of events

### Database Compromise Suspected
1. Immediately rotate all secrets (JWT keys, encryption keys)
2. Revoke ALL refresh tokens: `UPDATE refresh_tokens SET revoked=true`
3. Force all users to re-authenticate
4. Conduct forensic analysis
5. Restore from clean backup if necessary
6. Engage external security audit

### Privilege Escalation Attempt
1. Review audit logs for unauthorized permission checks
2. Verify RBAC middleware functioning correctly
3. Review recent role/permission changes
4. Check for SQL injection attempts in logs
5. Revoke suspicious user sessions
6. Patch if vulnerability identified

## Monitoring & Alerting

### Key Metrics to Monitor
- Failed login attempts per minute (threshold: >10 from single IP)
- Account lockouts per hour (threshold: >5)
- Token reuse detection events (threshold: >0, immediate alert)
- MFA failures per user (threshold: >5)
- Session revocations (track trends)
- Average response time on auth endpoints
- Database connection pool utilization
- Error rate on auth endpoints (threshold: >1%)

### Log Aggregation
All logs output as JSON to stdout for collection:
```json
{
  "timestamp": "2025-10-28T10:30:00Z",
  "level": "INFO",
  "event_type": "login_success",
  "correlation_id": "abc123",
  "user_id": "user-uuid",
  "ip_address": "10.0.1.50",
  "user_agent": "Mozilla/5.0...",
  "metadata": {}
}
```

Forward to: Splunk, ELK Stack, Datadog, or CloudWatch

### Alerts Configuration
- **Critical:** Token reuse detected, privilege escalation attempt
- **High:** Brute force attack, multiple account lockouts, MFA bypass attempt
- **Medium:** High failed login rate, unusual login location
- **Low:** Password policy violations, expired sessions not cleaned

## Compliance Considerations

This architecture supports:
- **NIST 800-63B:** Digital Identity Guidelines (AAL2)
- **OWASP ASVS v4.0:** Level 2 verification
- **FedRAMP:** Moderate impact baseline
- **FISMA:** Moderate categorization controls
- **GDPR:** Right to be forgotten (user deletion), audit trails
- **SOC 2 Type II:** Access controls, audit logging, encryption

## Performance Considerations

- **Database Indexing:** Indexes on frequently queried columns (email, username, token_hash, user_id)
- **Connection Pooling:** SQLAlchemy pool with min=5, max=20 connections
- **Token Caching:** Redis cache for active token validation (optional)
- **Rate Limiting:** Redis-backed sliding window counters
- **Horizontal Scaling:** Stateless FastAPI allows multiple instances behind load balancer
- **CDN:** Serve static frontend assets via CDN with proper cache headers
