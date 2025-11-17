# FastAPI Docker Setup

This document explains how to use Docker to run the FastAPI application in both development and production environments.

## Prerequisites

- Docker and Docker Compose installed
- SSL certificates for production (if using HTTPS)

## Quick Start

### Development Environment

1. **Start the development environment:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - API: http://localhost:8000
   - Database: localhost:5432
   - Health check: http://localhost:8000/health

3. **Stop the environment:**
   ```bash
   docker-compose down
   ```

### Production Environment

1. **Set up environment variables:**
   ```bash
   cp env.production.example .env.production
   # Edit .env.production with your actual values
   ```

2. **Create SSL directory and certificates:**
   ```bash
   mkdir -p ssl
   # Place your SSL certificates in the ssl/ directory:
   # - ssl/cert.pem (your SSL certificate)
   # - ssl/key.pem (your private key)
   ```

3. **Start production environment:**
   ```bash
   docker-compose -f docker-compose.prod.yml --env-file .env.production up --build -d
   ```

4. **Access the application:**
   - HTTP: http://yourdomain.com (redirects to HTTPS)
   - HTTPS: https://yourdomain.com
   - API endpoints: https://yourdomain.com/api/
   - Health check: https://yourdomain.com/health

5. **Stop production environment:**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

## Local Development (Without Docker)

Use the provided script to run the application locally:

```bash
./run_local.sh
```

This script will:
- Check Python and pip installation
- Create/activate a virtual environment
- Install dependencies
- Run the application with uvicorn

## Docker Configuration Details

### Dockerfile

The Dockerfile uses a multi-stage build approach:

1. **Builder stage**: Installs build dependencies and creates a virtual environment
2. **Production stage**: Creates a minimal production image with only runtime dependencies

**Features:**
- Uses Python 3.11-slim base image
- Multi-stage build for smaller final image
- Non-root user (app) for security
- Health checks
- Optimized for production with gunicorn + uvicorn workers

### Docker Compose Files

#### Development (`docker-compose.yml`)
- Includes hot-reload volumes
- Exposes ports for local development
- Uses default environment variables
- Includes health checks

#### Production (`docker-compose.prod.yml`)
- No development volumes
- Includes Nginx reverse proxy
- Uses environment file for configuration
- Proper networking and logging
- Health checks for all services

### Nginx Configuration

The Nginx configuration provides:
- HTTP to HTTPS redirect
- Reverse proxy to FastAPI (port 8000)
- SSL/TLS configuration
- Security headers
- Gzip compression
- Static file serving
- Health check proxying

## Environment Variables

### Required for Production
- `POSTGRES_DB`: Database name
- `POSTGRES_USER`: Database user
- `POSTGRES_PASSWORD`: Database password
- `JWT_SECRET`: Secret key for JWT tokens
- `ALLOWED_ORIGINS`: CORS allowed origins
- `ALLOWED_HOSTS`: Trusted host names

### Optional
- `SMTP_*`: Email configuration
- `FRONTEND_URL`: Frontend application URL

## Database

The setup includes PostgreSQL 15 with:
- Persistent volume storage
- Health checks
- Proper networking
- Environment-based configuration

## Security Features

- Non-root user in containers
- Health checks for all services
- Security headers in Nginx
- Environment-based configuration
- SSL/TLS support
- CORS and trusted host middleware

## Monitoring and Logging

- Health checks for API and database
- Structured logging with rotation
- Nginx access and error logs
- Container restart policies

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 8000, 5432, 80, and 443 are available
2. **Permission issues**: Check file permissions for SSL certificates
3. **Database connection**: Verify environment variables and network configuration
4. **SSL errors**: Ensure SSL certificates are properly placed in the `ssl/` directory

### Logs

View logs for specific services:
```bash
# API logs
docker-compose logs api

# Database logs
docker-compose logs db

# Nginx logs (production)
docker-compose -f docker-compose.prod.yml logs nginx
```

### Health Checks

Monitor service health:
```bash
# Check API health
curl http://localhost:8000/health

# Check database health
docker-compose exec db pg_isready -U postgres
```

## Performance Optimization

- Multi-stage Docker builds
- Gzip compression in Nginx
- Optimized worker configuration in gunicorn
- Connection pooling for database
- Proper timeout configurations

## Scaling

To scale the API service:
```bash
docker-compose -f docker-compose.prod.yml up -d --scale api=3
```

Note: Ensure your load balancer or Nginx configuration can handle multiple API instances.

## Backup and Recovery

### Database Backup
```bash
docker-compose exec db pg_dump -U postgres devicems > backup.sql
```

### Database Restore
```bash
docker-compose exec -T db psql -U postgres devicems < backup.sql
```

## Maintenance

### Update Dependencies
1. Update `requirements.txt`
2. Rebuild Docker images: `docker-compose build --no-cache`
3. Restart services: `docker-compose up -d`

### SSL Certificate Renewal
1. Replace certificates in the `ssl/` directory
2. Reload Nginx: `docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload`

## Support

For issues or questions:
1. Check the logs for error messages
2. Verify environment variable configuration
3. Ensure all prerequisites are met
4. Check Docker and Docker Compose versions
