# Docker Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the ARDHI Backend using Docker in development, staging, and production environments.

## Quick Start

### Prerequisites

- Docker 20.10+ (or latest stable version)
- Docker Compose 2.0+ (for multi-container deployments)
- 4GB RAM minimum (8GB recommended)
- 20GB disk space minimum
- Linux/Mac/Windows (WSL2)

### Build and Run (5 minutes)

\`\`\`bash
# Make script executable
chmod +x docker.sh

# Build production image
./docker.sh build --tag v1.0.0

# Run container
./docker.sh run --port 8000 --env-file .env.production

# View logs
./docker.sh logs --follow
\`\`\`

## Architecture

### Production Stack

\`\`\`
┌─────────────────────────────────────────┐
│          External Traffic               │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│     Nginx (Reverse Proxy)               │
│  - SSL/TLS Termination                  │
│  - Rate Limiting                        │
│  - Caching & Compression                │
│  - Security Headers                     │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│     FastAPI Backend (Gunicorn)          │
│  - 4 Worker Processes                   │
│  - Uvicorn Worker Class                 │
│  - Health Checks                        │
│  - Request Logging                      │
└────────────┬────────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
┌─────▼────┐  ┌────▼──────┐
│ PostgreSQL│  │   Redis   │
│ Database  │  │ Cache/PubSub
└───────────┘  └───────────┘
\`\`\`

## Dockerfile Strategy

### Multi-Stage Build Benefits

1. **Smaller Image Size**: Only runtime dependencies included
2. **Faster Deployments**: Reduced image transfer time
3. **Security**: No build tools in final image
4. **Production Ready**: Non-root user, health checks, logging

### Build Process

\`\`\`bash
# Stage 1: Builder
FROM python:3.11-slim as builder
├── Install build dependencies (gcc, postgresql-client)
├── Copy requirements.txt
└── Install Python packages to /root/.local

# Stage 2: Runtime
FROM python:3.11-slim
├── Create non-root user (appuser)
├── Install only runtime dependencies
├── Copy dependencies from builder
├── Copy application code
├── Set environment variables
├── Add health check
└── Run with non-root user
\`\`\`

## Nginx Configuration

### Security Features

\`\`\`nginx
# SSL/TLS with modern protocols
ssl_protocols TLSv1.2 TLSv1.3
ssl_ciphers [modern cipher suite]

# Security headers
Strict-Transport-Security: max-age=63072000
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Content-Security-Policy: [restrictive policy]
\`\`\`

### Performance Features

\`\`\`nginx
# HTTP/2 multiplexing
listen 443 ssl http2

# Gzip compression
gzip on
gzip_min_length 1024
gzip_types [text, application types]

# Connection optimization
keepalive_timeout 65
keepalive_requests 100

# Upstream health checks
least_conn balancing
keepalive 32 connections
\`\`\`

### Rate Limiting

\`\`\`nginx
# Login endpoint: 5 requests/minute
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m

# API endpoints: 100 requests/minute
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m

# Connection limiting: 10 concurrent per IP
limit_conn_zone $binary_remote_addr zone=addr:10m
limit_conn addr 10
\`\`\`

## Deployment Scenarios

### 1. Local Development

\`\`\`bash
# Development container with hot reload
./docker.sh run --port 8000 --env-file .env.development

# Advantages:
# - Live code reloading
# - Detailed logging
# - Full debugging capabilities
\`\`\`

### 2. Staging Environment

\`\`\`bash
# Run staging compose stack
COMPOSE_FILE=docker-compose.prod.yml \
ENV_FILE=.env.staging \
./docker.sh compose up

# Then configure:
# - SSL certificates (Let's Encrypt)
# - Database backups (daily)
# - Monitoring (Prometheus)
# - Logging (ELK stack)
\`\`\`

### 3. Production Deployment

\`\`\`bash
# Build production image
./docker.sh build --tag v1.0.0 --registry your-registry.com

# Tag for production
./docker.sh tag latest production

# Push to registry
./docker.sh push

# On production server:
docker pull your-registry.com/ardhi-backend:production
docker-compose -f docker-compose.prod.yml up -d
\`\`\`

## Docker Compose Files

### Development (docker-compose.yml)

\`\`\`yaml
services:
  api:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - .:/app  # Hot reload
    depends_on:
      - db
  
  db:
    image: postgres:15-alpine
    # Development database
\`\`\`

### Production (docker-compose.prod.yml)

\`\`\`yaml
services:
  api:
    image: registry/ardhi-backend:production
    # No volumes (immutable)
    # Resource limits
    # Restart policy
    # Health checks
    # Logging configuration
  
  db:
    # Persistent volumes
    # Backups configured
    # Monitoring enabled
  
  nginx:
    # SSL certificates
    # Rate limiting
    # Caching
  
  redis:
    # Session storage
    # Cache layer
\`\`\`

## Docker.sh Script Usage

### Building

\`\`\`bash
# Build with default tag
./docker.sh build

# Build with custom tag
./docker.sh build --tag v1.0.0

# Build with registry
./docker.sh build --registry gcr.io/my-project

# Build with custom Dockerfile
./docker.sh build --dockerfile Dockerfile.staging
\`\`\`

### Running

\`\`\`bash
# Run with defaults
./docker.sh run

# Custom port
./docker.sh run --port 9000

# Custom container name
./docker.sh run --name my-backend

# Custom environment file
./docker.sh run --env-file .env.custom

# All options
./docker.sh run --port 8000 \
  --name ardhi-backend \
  --env-file .env.production
\`\`\`

### Managing Containers

\`\`\`bash
# View logs (last 50 lines)
./docker.sh logs

# Follow logs in real-time
./docker.sh logs --follow

# Access container shell
./docker.sh shell

# Restart container
./docker.sh restart

# Stop container
./docker.sh stop
\`\`\`

### Docker Compose Operations

\`\`\`bash
# Start all services
./docker.sh compose up

# Stop all services
./docker.sh compose down

# View compose logs
./docker.sh compose logs

# Customize compose file
COMPOSE_FILE=docker-compose.custom.yml ./docker.sh compose up
\`\`\`

### Cleanup

\`\`\`bash
# Remove only containers
./docker.sh clean containers

# Remove only images
./docker.sh clean images

# Remove dangling resources
./docker.sh clean dangling

# Full cleanup (everything)
./docker.sh clean all
\`\`\`

## Environment Configuration

### Required Variables (.env.production)

\`\`\`bash
# Database
DATABASE_URL=postgresql://user:pass@db:5432/dbname
POSTGRES_DB=devicems
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_password

# Security
JWT_SECRET=your-super-secret-jwt-key
REFRESH_TOKEN_SECRET=your-refresh-token-secret

# Application
ENVIRONMENT=production
FRONTEND_URL=https://app.example.com
ALLOWED_ORIGINS=["https://app.example.com"]
ALLOWED_HOSTS=["app.example.com"]

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Redis
REDIS_URL=redis://redis:6379/0

# Logging
LOG_LEVEL=info

# SSL Paths
SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
SSL_KEY_PATH=/etc/nginx/ssl/key.pem
\`\`\`

### Optional Variables

\`\`\`bash
# Performance
WORKERS=4
WORKER_CLASS=uvicorn.workers.UvicornWorker

# Monitoring
SENTRY_DSN=https://key@sentry.io/project
DATADOG_API_KEY=your-datadog-key

# Features
ENABLE_ANALYTICS=true
ENABLE_RATE_LIMITING=true
\`\`\`

## Networking

### Port Mappings

| Service | Internal | External | Purpose |
|---------|----------|----------|---------|
| API | 8000 | 8000 | Application server |
| Nginx | 80/443 | 80/443 | Reverse proxy |
| PostgreSQL | 5432 | 5432* | Database (*dev only) |
| Redis | 6379 | 6379* | Cache (*dev only) |

*Ports 5432 and 6379 should NOT be exposed in production

### Network Configuration

\`\`\`bash
# Create custom network
docker network create ardhi-network

# Run container on custom network
docker run --network ardhi-network ...

# View network
docker network inspect ardhi-network
\`\`\`

## Volumes and Persistence

### Volume Mounts

\`\`\`bash
# Application logs
-v /app/logs:/app/logs

# Secrets directory
-v /app/secrets:/app/secrets

# Database data (production)
-v postgres_data:/var/lib/postgresql/data

# Nginx logs
-v nginx_logs:/var/log/nginx

# Redis data
-v redis_data:/data
\`\`\`

### Backup Strategy

\`\`\`bash
# Daily database backup
docker exec ardhi-backend-db pg_dump -U postgres devicems | \
  gzip > /backups/db-$(date +%Y%m%d).sql.gz

# Weekly full backup
docker run --volumes-from=ardhi-backend-db \
  -v /backups:/backup \
  postgres:15 \
  tar czf /backup/volumes-$(date +%Y%m%d).tar.gz /var/lib/postgresql/data
\`\`\`

## Security Best Practices

### Container Security

1. **Non-root User**: Containers run as `appuser` (UID 1000)
2. **Read-only Root**: Container filesystem is mostly read-only
3. **No Sudo**: No sudo access in containers
4. **Security Scanning**: Use Trivy/Grype for vulnerability scanning

### Network Security

1. **SSL/TLS**: Enforced on all external connections
2. **Rate Limiting**: Protect against brute force attacks
3. **Firewall**: Use Docker network isolation
4. **VPN**: Use VPN for database access

### Secret Management

\`\`\`bash
# Use Docker secrets (Swarm)
echo "secret-value" | docker secret create secret-name -

# Use environment files (compose)
--env-file .env.production

# Use Kubernetes secrets
kubectl create secret generic db-credentials ...

# Use HashiCorp Vault
vault kv get secret/ardhi/database
\`\`\`

## Troubleshooting

### Container Won't Start

\`\`\`bash
# Check logs
./docker.sh logs

# View detailed error
docker inspect ardhi-backend-container

# Verify image
docker images | grep ardhi-backend
\`\`\`

### Port Already in Use

\`\`\`bash
# Find process using port
lsof -i :8000

# Kill process
kill -9 PID

# Or use different port
./docker.sh run --port 9000
\`\`\`

### Database Connection Issues

\`\`\`bash
# Test database connection
docker exec ardhi-backend \
  psql -h db -U postgres -c "SELECT 1"

# Check network
docker network inspect ardhi-network

# Verify environment variables
docker exec ardhi-backend env | grep DATABASE
\`\`\`

### Performance Issues

\`\`\`bash
# Check resource usage
docker stats ardhi-backend-container

# View logs for errors
./docker.sh logs | grep -i error

# Check database performance
docker exec ardhi-backend-db psql -U postgres -c "\d+"
\`\`\`

## Monitoring and Logging

### Container Health

\`\`\`bash
# Real-time stats
docker stats

# Container status
docker ps --format "table {{.Names}}\t{{.Status}}"

# Health check status
docker inspect --format='{{json .State.Health}}' container-name
\`\`\`

### Log Management

\`\`\`bash
# View logs
docker logs container-name

# Follow logs
docker logs -f container-name

# Last N lines
docker logs --tail 100 container-name

# Timestamps
docker logs -t container-name
\`\`\`

### Log Rotation

\`\`\`yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"      # Rotate when size reaches 10MB
    max-file: "3"        # Keep 3 rotated files
    labels: "service=ardhi-backend"
\`\`\`

## Advanced Topics

### Multi-Architecture Builds

\`\`\`bash
# Build for multiple architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t registry/ardhi-backend:multiarch .

# Push multi-arch image
docker buildx build --push \
  --platform linux/amd64,linux/arm64 \
  -t registry/ardhi-backend:latest .
\`\`\`

### CI/CD Integration

\`\`\`yaml
# GitHub Actions example
- name: Build and push Docker image
  run: |
    docker build -t ardhi-backend:${{ github.sha }} .
    docker push ardhi-backend:${{ github.sha }}
    docker tag ardhi-backend:${{ github.sha }} ardhi-backend:latest
    docker push ardhi-backend:latest
\`\`\`

### Resource Limits

\`\`\`bash
# CPU limit: 2 cores
docker run --cpus 2 ardhi-backend

# Memory limit: 1GB
docker run -m 1g ardhi-backend

# Disk I/O limits
docker run --blkio-weight 100 ardhi-backend
\`\`\`

## Support and Troubleshooting

For issues:

1. **Check logs**: `./docker.sh logs`
2. **Verify configuration**: Ensure `.env` files are correct
3. **Check Docker resources**: Ensure sufficient CPU/memory
4. **Review documentation**: See this guide for solutions
5. **Contact support**: Provide logs and Docker version

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-17 | Initial production release |

## License

Production deployment scripts provided as-is.
