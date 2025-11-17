.PHONY: help dev prod down build clean logs shell test migrate

# Default target
help:
	@echo "Available commands:"
	@echo "  dev          - Start development environment"
	@echo "  prod         - Start production environment"
	@echo "  down         - Stop all containers"
	@echo "  build        - Build Docker images"
	@echo "  clean        - Remove containers, images, and volumes"
	@echo "  logs         - Show logs for all services"
	@echo "  shell        - Open shell in API container"
	@echo "  test         - Run tests"
	@echo "  migrate      - Run database migrations"
	@echo "  local        - Run locally without Docker"

# Development environment
dev:
	@echo "Starting development environment..."
	docker-compose up --build

# Production environment
prod:
	@echo "Starting production environment..."
	@if [ ! -f .env.production ]; then \
		echo "Error: .env.production file not found. Please copy env.production.example and configure it."; \
		exit 1; \
	fi
	docker-compose -f docker-compose.prod.yml --env-file .env.production up --build -d

# Stop all containers
down:
	@echo "Stopping all containers..."
	docker-compose down
	docker-compose -f docker-compose.prod.yml down

# Build Docker images
build:
	@echo "Building Docker images..."
	docker-compose build --no-cache

# Clean up everything
clean:
	@echo "Cleaning up containers, images, and volumes..."
	docker-compose down -v --rmi all
	docker-compose -f docker-compose.prod.yml down -v --rmi all
	docker system prune -f

# Show logs
logs:
	@echo "Showing logs for all services..."
	docker-compose logs -f

# Production logs
logs-prod:
	@echo "Showing production logs..."
	docker-compose -f docker-compose.prod.yml logs -f

# Open shell in API container
shell:
	@echo "Opening shell in API container..."
	docker-compose exec api /bin/bash

# Production shell
shell-prod:
	@echo "Opening shell in production API container..."
	docker-compose -f docker-compose.prod.yml exec api /bin/bash

# Run tests
test:
	@echo "Running tests..."
	docker-compose exec api python -m pytest

# Run database migrations
migrate:
	@echo "Running database migrations..."
	docker-compose exec api alembic upgrade head

# Production migrations
migrate-prod:
	@echo "Running production database migrations..."
	docker-compose -f docker-compose.prod.yml exec api alembic upgrade head

# Run locally without Docker
local:
	@echo "Running application locally..."
	@if [ ! -x "./run_local.sh" ]; then \
		echo "Error: run_local.sh not found or not executable"; \
		exit 1; \
	fi
	./run_local.sh

# Health check
health:
	@echo "Checking service health..."
	@curl -f http://localhost:8000/health || echo "API is not responding"
	@docker-compose exec -T db pg_isready -U postgres || echo "Database is not responding"

# Production health check
health-prod:
	@echo "Checking production service health..."
	@curl -f https://localhost/health || echo "Production API is not responding"

# Backup database
backup:
	@echo "Creating database backup..."
	@mkdir -p backups
	docker-compose exec -T db pg_dump -U postgres devicems > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql

# Restore database
restore:
	@echo "Restoring database from backup..."
	@if [ -z "$(file)" ]; then \
		echo "Error: Please specify backup file with file=<filename>"; \
		echo "Example: make restore file=backups/backup_20231201_120000.sql"; \
		exit 1; \
	fi
	docker-compose exec -T db psql -U postgres devicems < $(file)

# Show container status
status:
	@echo "Container status:"
	docker-compose ps
	@echo ""
	@echo "Production container status:"
	docker-compose -f docker-compose.prod.yml ps

# Restart services
restart:
	@echo "Restarting development services..."
	docker-compose restart

# Restart production services
restart-prod:
	@echo "Restarting production services..."
	docker-compose -f docker-compose.prod.yml restart

# Update dependencies and rebuild
update:
	@echo "Updating dependencies and rebuilding..."
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d
