# Government-Grade Authentication System

A production-ready, government-grade authentication system built with FastAPI (Python), PostgreSQL, React, TypeScript, and Tailwind CSS. Implements defense-in-depth security controls suitable for high-sensitivity environments.

## Features

### Security Controls
- **Argon2id Password Hashing** with tuned parameters (time=3, memory=65536, parallelism=4)
- **JWT Access Tokens** (15-minute expiration, RS256 or HS256)
- **Rotating Refresh Tokens** with one-time use semantics and reuse detection
- **HttpOnly, Secure, SameSite=Strict Cookies** for refresh tokens
- **CSRF Protection** via double-submit cookie pattern
- **Multi-Factor Authentication** (TOTP with QR code setup and backup codes)
- **Account Lockout** with progressive backoff after failed attempts
- **Rate Limiting** per-IP and per-user on all auth endpoints
- **Brute Force Protection** with IP and username tracking
- **Audit Logging** for all authentication events (SIEM-ready)
- **Session Management** with device tracking and revocation
- **RBAC (Role-Based Access Control)** with granular permissions
- **Security Headers** (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)

### Compliance
- NIST 800-63B (AAL2)
- OWASP ASVS v4.0 Level 2
- FedRAMP Moderate baseline
- FISMA Moderate controls

## Technology Stack

### Backend
- **FastAPI** 0.109.0 (Python 3.11+)
- **PostgreSQL** 15+ (with asyncpg driver)
- **SQLAlchemy** 2.0+ (async ORM)
- **Alembic** (database migrations)
- **Redis** (rate limiting and caching)
- **Argon2-CFFI** (password hashing)
- **Python-JOSE** (JWT handling)
- **PyOTP** (TOTP for 2FA)

### Frontend
- **React** 18
- **TypeScript** 5
- **Vite** 5
- **Tailwind CSS** 3
- **React Router** 6
- **Lucide React** (icons)

### Infrastructure
- **Docker** & **Docker Compose**
- **Nginx** (reverse proxy with TLS)
- **PostgreSQL** container
- **Redis** container

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/      # API route handlers
│   │   ├── core/                  # Core configuration
│   │   │   ├── config.py          # Settings management
│   │   │   └── security.py        # Security utilities
│   │   ├── db/                    # Database setup
│   │   ├── models/                # SQLAlchemy models
│   │   ├── schemas/               # Pydantic schemas
│   │   ├── services/              # Business logic
│   │   ├── middleware/            # Custom middleware
│   │   └── main.py                # FastAPI application
│   ├── alembic/                   # Database migrations
│   ├── migrations/                # SQL migration files
│   ├── tests/                     # Test suite
│   ├── scripts/                   # Utility scripts
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── src/
│   ├── components/                # React components
│   ├── contexts/                  # React contexts (Auth)
│   ├── pages/                     # Page components
│   ├── services/                  # API client
│   ├── types/                     # TypeScript types
│   └── App.tsx
├── docker-compose.yml
├── ARCHITECTURE.md                # System architecture
└── README.md
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd project
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set secure values for:
- `REFRESH_TOKEN_SIGNING_KEY` (min 32 characters)
- `CSRF_SECRET_KEY` (min 32 characters)
- `SESSION_SECRET_KEY` (min 32 characters)

Generate secure keys:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. Start with Docker Compose

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- FastAPI backend on port 8000
- Nginx on port 443 (HTTPS)

### 4. Initialize Database

```bash
docker-compose exec postgres psql -U authuser -d authdb -f /docker-entrypoint-initdb.d/001_init_auth_schema.sql
```

Or use Alembic migrations:
```bash
docker-compose exec backend alembic upgrade head
```

### 5. Create Test User

Connect to the database and create a test user:

```bash
docker-compose exec postgres psql -U authuser -d authdb
```

```sql
-- Get the 'user' role ID
SELECT id FROM roles WHERE name = 'user';

-- Insert test user (password: TestPassword123!)
INSERT INTO users (email, username, password_hash, is_active, is_verified, role_id)
VALUES (
    'test@example.com',
    'testuser',
    '$argon2id$v=19$m=65536,t=3,p=4$...',  -- Use actual hash
    true,
    true,
    (SELECT id FROM roles WHERE name = 'user')
);
```

To generate password hash:
```python
from argon2 import PasswordHasher
ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)
print(ph.hash("TestPassword123!"))
```

### 6. Start Frontend

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

### 7. Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/api/docs

## Development Setup

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Run backend:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
npm install
npm run dev
```

### Run Tests

Backend tests:
```bash
cd backend
pytest tests/ -v
```

Frontend tests:
```bash
npm test
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login with username/password
- `POST /api/v1/auth/mfa/verify` - Verify TOTP code
- `POST /api/v1/auth/refresh` - Rotate refresh token
- `POST /api/v1/auth/logout` - Logout and revoke session
- `GET /api/v1/auth/me` - Get current user profile

### MFA Management
- `POST /api/v1/auth/mfa/enable` - Enable 2FA
- `POST /api/v1/auth/mfa/disable` - Disable 2FA
- `POST /api/v1/auth/mfa/backup-code` - Use backup code

### Session Management
- `GET /api/v1/auth/sessions` - List active sessions
- `DELETE /api/v1/auth/sessions/:id` - Revoke session
- `DELETE /api/v1/auth/sessions/all` - Revoke all sessions

### Password Management
- `POST /api/v1/auth/password/change` - Change password
- `POST /api/v1/auth/password/reset/request` - Request reset
- `POST /api/v1/auth/password/reset/confirm` - Confirm reset

### Admin Endpoints
- `GET /api/v1/admin/users` - List users
- `GET /api/v1/admin/audit-logs` - View audit logs
- `DELETE /api/v1/admin/users/:id/sessions` - Revoke user sessions

## Database Schema

See `backend/migrations/001_init_auth_schema.sql` for complete schema with comments.

Key tables:
- `users` - User accounts with lockout support
- `roles` & `permissions` - RBAC system
- `refresh_tokens` - Refresh tokens with rotation
- `sessions` - Active user sessions
- `audit_logs` - Comprehensive audit trail
- `failed_login_attempts` - Brute force tracking
- `mfa_secrets` - TOTP secrets and backup codes

## Security Configuration

### Password Policy
- Minimum 12 characters
- Must contain: uppercase, lowercase, digit, special character
- Common password blocklist
- Argon2id hashing with tuned parameters

### Session Configuration
- Access token: 15 minutes (JWT)
- Refresh token: 7 days (rotating, one-time use)
- Account lockout: 5 failed attempts → progressive backoff
- Rate limits: 100/min per IP, 20/min per user

### HTTPS/TLS Setup

For development with self-signed certificates:

```bash
mkdir -p nginx/certs
cd nginx/certs

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout dev.auth.local.key \
  -out dev.auth.local.crt \
  -subj "/CN=dev.auth.local"
```

Add to `/etc/hosts`:
```
127.0.0.1  dev.auth.local
127.0.0.1  dev.frontend.local
```

**Production:** Use Let's Encrypt with cert-manager on Kubernetes

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql+asyncpg://authuser:securepassword@postgres:5432/authdb

# JWT
JWT_ALGORITHM=RS256  # or HS256 for development
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15

# Refresh Token
REFRESH_TOKEN_EXPIRE_DAYS=7
REFRESH_TOKEN_SIGNING_KEY=<secure-key-32-chars>

# Argon2
ARGON2_TIME_COST=3
ARGON2_MEMORY_COST=65536
ARGON2_PARALLELISM=4

# CORS
CORS_ORIGINS=https://dev.frontend.local:3000,https://frontend.production.gov

# Security
CSRF_SECRET_KEY=<secure-key-32-chars>
SESSION_SECRET_KEY=<secure-key-32-chars>

# Rate Limiting
RATE_LIMIT_PER_IP=100/minute
RATE_LIMIT_PER_USER=20/minute

# MFA
MFA_ISSUER_NAME=GovernmentAuthSystem

# Redis
REDIS_URL=redis://redis:6379/0

# Environment
ENV=development
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:8000/api/v1
```

## Production Deployment

### Kubernetes Deployment

See `ARCHITECTURE.md` for complete Kubernetes architecture.

Key considerations:
1. Use Secrets Manager (Vault, AWS Secrets Manager, Azure Key Vault)
2. Enable HTTPS with valid certificates
3. Configure horizontal pod autoscaling for FastAPI
4. Use PostgreSQL StatefulSet with backups
5. Enable monitoring (Prometheus, Grafana)
6. Configure log aggregation (ELK, Splunk)
7. Set up alerting for security events

### Docker Production Build

```bash
# Backend
docker build -t auth-backend:prod ./backend

# Frontend
docker build -t auth-frontend:prod .

# Run with production compose
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring & Observability

### Audit Events
All authentication events are logged:
- `login_success` / `login_failed`
- `mfa_enabled` / `mfa_disabled` / `mfa_success` / `mfa_failed`
- `token_rotated` / `token_reuse_detected`
- `password_changed`
- `account_locked` / `logout`
- `session_revoked`

### Metrics to Monitor
- Failed login attempts per minute
- Account lockouts per hour
- Token reuse detection events (critical alert)
- MFA failures per user
- Average response time
- Database connection pool utilization
- Error rate on auth endpoints

### Log Format
Structured JSON logs for SIEM integration:
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

## Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v --cov=app

# Run specific test categories
pytest tests/api/ -v           # API tests
pytest tests/services/ -v       # Service tests
pytest tests/security/ -v       # Security tests
```

### Frontend Tests

```bash
npm test                        # Run all tests
npm run test:coverage          # With coverage
```

### Manual Testing

Use Postman collection:
```bash
# Import: backend/tests/postman_collection.json
```

Test scenarios:
1. Login flow (with/without MFA)
2. Token refresh and rotation
3. Token reuse detection
4. Account lockout
5. Session revocation
6. Password change
7. Brute force protection

## Security Checklist

- [ ] All environment variables set with secure values
- [ ] HTTPS enabled with valid certificates
- [ ] Database uses strong password
- [ ] JWT keys generated and secured
- [ ] Rate limiting configured
- [ ] CORS origins restricted
- [ ] Security headers enabled
- [ ] Audit logging active
- [ ] Database backups configured
- [ ] Monitoring and alerting set up
- [ ] Incident response runbook reviewed
- [ ] Dependencies scanned for vulnerabilities
- [ ] Secrets managed via Secrets Manager
- [ ] No secrets in source code or logs

## Incident Response

### Token Reuse Detected
1. Automatically revokes all tokens for affected user
2. Alert sent to security team
3. User notified via email
4. Review audit logs for unauthorized access
5. Force password reset if suspicious

### Brute Force Attack
1. Check `failed_login_attempts` table
2. Block IPs at firewall/WAF level
3. Review rate limiting effectiveness
4. Consider temporary tightening of limits

### Database Compromise
1. Rotate all secrets immediately
2. Revoke ALL refresh tokens
3. Force re-authentication
4. Conduct forensic analysis
5. Restore from clean backup if necessary

See `ARCHITECTURE.md` for complete incident response procedures.

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Verify database connection
docker-compose exec backend python -c "from app.db.base import engine; print('DB OK')"
```

### Frontend can't connect to backend
```bash
# Check CORS settings in backend/.env
# Verify API_URL in frontend/.env
# Check browser console for errors
```

### Login fails with valid credentials
```bash
# Check user is active and not locked
docker-compose exec postgres psql -U authuser -d authdb
SELECT username, is_active, locked_until, failed_attempts FROM users WHERE username='testuser';
```

### Token refresh fails
```bash
# Check refresh token in database
SELECT * FROM refresh_tokens WHERE user_id='<user-id>' AND revoked=false;

# Verify cookie settings (HttpOnly, Secure, SameSite)
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

Proprietary - Government Use Only

## Support

For security issues: security@example.gov
For general questions: support@example.gov

## Acknowledgments

- NIST Digital Identity Guidelines
- OWASP Application Security Verification Standard
- FedRAMP Security Controls
- Industry best practices for authentication systems
