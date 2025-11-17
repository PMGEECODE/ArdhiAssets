# Quick Start Guide

Get the government-grade authentication system running in 5 minutes.

## Prerequisites

- Docker Desktop installed
- 4GB RAM available
- Ports 5432, 6379, 8000, 5173 available

## Step 1: Start the Backend Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be healthy (30 seconds)
docker-compose ps
```

## Step 2: Initialize Database

```bash
# Run the database migration
docker-compose exec postgres psql -U authuser -d authdb < backend/migrations/001_init_auth_schema.sql

# Verify tables created
docker-compose exec postgres psql -U authuser -d authdb -c "\dt"
```

Expected output: 9 tables (users, roles, permissions, etc.)

## Step 3: Create Backend Environment

```bash
cd backend
cp .env.example .env

# Generate secure keys
python3 -c "import secrets; print('REFRESH_TOKEN_SIGNING_KEY=' + secrets.token_urlsafe(32))" >> .env
python3 -c "import secrets; print('CSRF_SECRET_KEY=' + secrets.token_urlsafe(32))" >> .env
python3 -c "import secrets; print('SESSION_SECRET_KEY=' + secrets.token_urlsafe(32))" >> .env
```

## Step 4: Start Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will start on http://localhost:8000

Visit http://localhost:8000/api/docs for API documentation

## Step 5: Create Test Users

```bash
# In a new terminal
cd backend
python scripts/create_test_user.py
```

This creates:
- **Username:** testuser | **Password:** TestPassword123!
- **Username:** admin | **Password:** AdminPassword123!

## Step 6: Start Frontend

```bash
# In project root
npm install
npm run dev
```

Frontend will start on http://localhost:5173

## Step 7: Test the System

1. Open http://localhost:5173 in your browser
2. Login with:
   - Username: `testuser`
   - Password: `TestPassword123!`
3. You should see the secure dashboard

## Verify Security Features

### Test 1: Account Lockout
Try to login with wrong password 5 times - account should lock for 5 minutes.

### Test 2: Token Rotation
Open browser DevTools → Network tab → Login → See refresh token cookie set with HttpOnly, Secure, SameSite=Strict

### Test 3: Access Token Expiration
Wait 15 minutes, make an API call - should automatically refresh

### Test 4: Session Management
Login from 2 different browsers - both sessions should appear in dashboard

## Troubleshooting

### Backend won't start
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres
```

### Frontend can't connect
```bash
# Verify backend is running
curl http://localhost:8000/health

# Check .env file
cat .env
# Should have: VITE_API_URL=http://localhost:8000/api/v1
```

### Database connection error
```bash
# Restart PostgreSQL
docker-compose restart postgres

# Wait 10 seconds
sleep 10

# Test connection
docker-compose exec postgres psql -U authuser -d authdb -c "SELECT 1;"
```

## Next Steps

1. **Read ARCHITECTURE.md** - Understand the security model
2. **Review SECURITY_RUNBOOK.md** - Learn incident response
3. **Check API docs** - http://localhost:8000/api/docs
4. **Enable MFA** - Use the /api/v1/auth/mfa/enable endpoint
5. **Run tests** - `cd backend && pytest tests/`

## Production Deployment

See DEPLOYMENT.md for Kubernetes deployment instructions.

## Security Warnings

### Development Mode
- Uses HTTP instead of HTTPS
- Uses HS256 instead of RS256 for JWT
- Reduced security settings for ease of development

### Before Production
- Generate RSA key pair for JWT signing
- Enable HTTPS with valid certificates
- Update all secret keys
- Configure proper CORS origins
- Enable rate limiting
- Set up monitoring and alerting
- Review all security settings

## Support

Questions? Check:
- README.md - Full documentation
- ARCHITECTURE.md - System design
- DEPLOYMENT.md - Production setup
- SECURITY_RUNBOOK.md - Incident response

## License

Proprietary - Government Use Only
