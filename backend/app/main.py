# app/main.py
"""
FastAPI main application entry point
Merged from Government-Grade Auth API + DeviceMS API
"""

import logging
import sys
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Callable, Awaitable

import uvicorn
from fastapi import FastAPI, Request, status
from fastapi.exception_handlers import http_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles

# ----------------------------------------------------------------------
# 3rd-party rate-limit (slowapi)
# ----------------------------------------------------------------------
from slowapi.extension import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# ----------------------------------------------------------------------
# Project imports
# ----------------------------------------------------------------------
from app.core.config import settings
from app.core.database import init_db 
from app.core.scheduler import lifespan_scheduler, get_scheduler_status, scheduler
from app.routers import (
    auth,
    custom_otp,
    users,
    audit,
    notifications,
    buildings,
    vehicles,
    office_equipment,
    land_assets,
    furniture_equipments,
    portable_items,
    plant_machinery,
    ict_assets,
    dashboard,
    permissions,
    backups,
    financial,
)
# from app.utils.create_default_user import create_default_user

# ----------------------------------------------------------------------
# Logging – JSON + correlation_id
# ----------------------------------------------------------------------
class CorrelationIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.correlation_id = getattr(record, "request_id", "none")
        return True


class AccessLogFilter(logging.Filter):
    """Filter to suppress 401/403 responses from access logs"""
    def filter(self, record: logging.LogRecord) -> bool:
        # Only filter records that contain HTTP status codes
        message = record.getMessage()
        # Suppress logs for expected auth errors (401, 403)
        if "401" in message or "403" in message:
            return False
        return True


formatter = logging.Formatter(
    '{"timestamp":"%(asctime)s","level":"%(levelname)s","message":"%(message)s","correlation_id":"%(correlation_id)s"}'
)

handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(formatter)
handler.addFilter(CorrelationIdFilter())

root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
for h in root_logger.handlers[:]:
    root_logger.removeHandler(h)
root_logger.addHandler(handler)

# SQLAlchemy logger (optional, only verbose in dev)
sql_logger = logging.getLogger("sqlalchemy.engine")
sql_logger.propagate = False
sql_handler = logging.StreamHandler(sys.stdout)
sql_handler.setFormatter(formatter)
sql_handler.addFilter(CorrelationIdFilter())
sql_logger.addHandler(sql_handler)
sql_logger.setLevel(logging.INFO if settings.ENV == "development" else logging.WARNING)

logger = logging.getLogger(__name__)

uvicorn_logger = logging.getLogger("uvicorn.access")
uvicorn_logger.addFilter(AccessLogFilter())

# ----------------------------------------------------------------------
# Rate limiter
# ----------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address)


# ----------------------------------------------------------------------
# Lifespan – startup / shutdown
# ----------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ----- Startup -----
    logger.info("Starting application...")

    # Uploads dirs
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)
    (uploads_dir / "vehicles").mkdir(exist_ok=True)
    logger.info("Upload directories ready")

    # Backups dir
    Path("backups").mkdir(exist_ok=True)
    logger.info("Backups directory ready")

    await init_db()
    logger.info("Database tables ready")

    # Scheduler
    scheduler.start()
    logger.info("Scheduler started")

    yield

    # ----- Shutdown -----
    logger.info("Shutting down application...")
    scheduler.shutdown()
    logger.info("Scheduler stopped")


# ----------------------------------------------------------------------
# FastAPI app
# ----------------------------------------------------------------------
app = FastAPI(
    title="DeviceMS + Government-Grade Auth API",
    description="Full-stack Device Management + Secure Authentication",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.ENV != "production" else None,
    redoc_url="/api/redoc" if settings.ENV != "production" else None,
)

app.state.limiter = limiter

# ----------------------------------------------------------------------
# Static files
# ----------------------------------------------------------------------
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# ----------------------------------------------------------------------
# Middlewares
# ----------------------------------------------------------------------
# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Correlation-ID", "Content-Type", "Authorization"],  # explicitly expose needed headers for credentials requests
)

# Trusted hosts (only in prod)
if settings.ENV == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=getattr(settings, "ALLOWED_HOSTS", ["*"]),
    )

# ----------------------------------------------------------------------
# Custom HTTP middlewares (correlation-id + security headers)
# ----------------------------------------------------------------------
@app.middleware("http")
async def add_correlation_id(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
):
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    request.state.correlation_id = correlation_id

    def _set(record: logging.LogRecord) -> bool:
        record.request_id = correlation_id
        return True

    handler.addFilter(_set)
    response = await call_next(request)
    response.headers["X-Correlation-ID"] = correlation_id
    handler.removeFilter(_set)
    return response


@app.middleware("http")
async def add_security_headers(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
):
    response = await call_next(request)
    response.headers.update(
        {
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data:; "
                "font-src 'self'; "
                "connect-src 'self'; "
                "frame-ancestors 'none';"
            ),
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
        }
    )
    return response


# ----------------------------------------------------------------------
# Rate-limit exception handler (slowapi)
# ----------------------------------------------------------------------
def rate_limit_handler(request: Request, exc: Exception) -> Response:
    if isinstance(exc, RateLimitExceeded):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Rate limit exceeded"},
        )
    return Response("Unhandled exception", status_code=500)


app.add_exception_handler(RateLimitExceeded, rate_limit_handler)


# ----------------------------------------------------------------------
# Routes
# ----------------------------------------------------------------------
@app.get("/internal/scheduler")
async def scheduler_status():
    return get_scheduler_status()


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "environment": settings.ENV,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "DeviceMS + Government-Grade Auth API",
        "version": "2.0.0",
        "docs": "/api/docs",
    }
    

@app.get("/debug-ip")
def debug_ip(request: Request):
    return {
        "client_host": request.client.host if request.client else None,
        "x_forwarded_for": request.headers.get("X-Forwarded-For"),
        "x_real_ip": request.headers.get("X-Real-IP"),
        "all_headers": dict(request.headers),
    }


# ----------------------------------------------------------------------
# Include all routers
# ----------------------------------------------------------------------
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(custom_otp.router, prefix="/api/otp", tags=["Custom OTP"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(audit.router, prefix="/api/audit-logs", tags=["Audit Logs"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(buildings.router, prefix="/api/buildings", tags=["Buildings"])
app.include_router(vehicles.router, prefix="/api/vehicles", tags=["Vehicles"])
app.include_router(office_equipment.router, prefix="/api/office-equipment", tags=["Office Equipment"])
app.include_router(land_assets.router, prefix="/api/land-assets", tags=["Land Assets"])
app.include_router(furniture_equipments.router, prefix="/api/furniture-equipment", tags=["Furniture Equipments"])
app.include_router(portable_items.router, prefix="/api/portable-items", tags=["Portable Items"])
app.include_router(plant_machinery.router, prefix="/api/plant-machinery", tags=["Plant & Machinery"])
app.include_router(ict_assets.router, prefix="/api/ict-assets", tags=["ICT Assets"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(permissions.router, prefix="/api/permissions", tags=["Permissions"])
app.include_router(backups.router, prefix="/api/backups", tags=["Backups"])


# ----------------------------------------------------------------------
# Global exception handler (with correlation_id)
# ----------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    logger.error(
        f"Unhandled exception: {exc}",
        extra={"request_id": correlation_id},
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error", "correlation_id": correlation_id},
    )


# ----------------------------------------------------------------------
