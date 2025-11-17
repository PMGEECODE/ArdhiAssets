# DeviceMS FastAPI Backend

A modern FastAPI backend for the DeviceMS (Device Management System) application.

## Features

- **FastAPI Framework**: Modern, fast web framework for building APIs with Python
- **SQLAlchemy ORM**: Async database operations with PostgreSQL
- **JWT Authentication**: Secure token-based authentication with 2FA support
- **Role-based Access Control**: Admin and user roles with proper permissions
- **Audit Logging**: Comprehensive activity tracking and logging
- **Background Jobs**: Automated password expiration and session timeout checks
- **Rate Limiting**: API rate limiting for security
- **Email Notifications**: SMTP-based email notifications
- **API Documentation**: Auto-generated OpenAPI/Swagger documentation

## Project Structure

\`\`\`
fastapi-server/
├── app/
│   ├── core/           # Core configuration and dependencies
│   ├── models/         # SQLAlchemy database models
│   ├── schemas/        # Pydantic schemas for validation
│   ├── routers/        # API route handlers
│   ├── services/       # Business logic services
│   ├── middleware/     # Custom middleware
│   ├── jobs/           # Background job definitions
│   └── utils/          # Utility functions
├── alembic/            # Database migrations
├── tests/              # Test suite
├── scripts/            # Utility scripts
├── main.py             # FastAPI application entry point
├── requirements.txt    # Python dependencies
└── docker-compose.yml  # Docker configuration
\`\`\`

## Quick Start

1. **Install Dependencies**
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

2. **Set Environment Variables**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

3. **Run Database Migrations**
   \`\`\`bash
   alembic upgrade head
   \`\`\`

4. **Create Default Admin User**
   \`\`\`bash
   python scripts/create_admin.py
   \`\`\`

5. **Start the Server**
   \`\`\`bash
   uvicorn main:app --reload
   \`\`\`

6. **Access API Documentation**
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## Docker Deployment

\`\`\`bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
\`\`\`

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/reset-password` - Reset password with token

### Devices
- `GET /devices` - List devices with filtering
- `POST /devices` - Create new device
- `GET /devices/{id}` - Get device details
- `PUT /devices/{id}` - Update device
- `DELETE /devices/{id}` - Delete device
- `POST /devices/bulk` - Bulk operations
- `POST /devices/{id}/transfer` - Transfer device ownership

### Users
- `GET /users` - List users (admin only)
- `POST /users` - Create user (admin only)
- `GET /users/{id}` - Get user details
- `PUT /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user (admin only)

### Audit Logs
- `GET /audit` - List audit logs
- `GET /audit/export` - Export audit logs

### Notifications
- `GET /notifications` - List user notifications
- `PUT /notifications/{id}/read` - Mark notification as read

## Testing

\`\`\`bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_auth.py
\`\`\`

## Environment Variables

See `.env.example` for all required environment variables including database connection, JWT secrets, and SMTP configuration.
