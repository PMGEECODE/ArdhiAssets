"""
Isolated PostgreSQL Database Configuration for Master Password
This module provides a completely separate database connection for master password
storage, ensuring security isolation from the main application database.

Environment Variables Required:
- ISOLATED_MASTER_PASSWORD_DB_URL: PostgreSQL connection string for isolated DB
  Example: postgresql+asyncpg://user:password@host:5432/master_password_db
"""

import logging
from typing import AsyncGenerator, Optional
from pathlib import Path

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
    AsyncEngine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

logger = logging.getLogger(__name__)


# ==============================================================================
# Isolated Master Password Database Configuration
# ==============================================================================

class IsolatedBase(DeclarativeBase):
    """Base class for isolated master password database models"""
    pass


def get_isolated_db_url() -> str:
    """
    Get the isolated database URL from environment.
    Falls back to main database if not configured for development.
    
    IMPORTANT: In production, this MUST be configured separately!
    """
    isolated_url = getattr(settings, "ISOLATED_MASTER_PASSWORD_DB_URL", None)
    
    if not isolated_url:
        logger.warning(
            "⚠️  ISOLATED_MASTER_PASSWORD_DB_URL not configured. "
            "Using main database for master password storage (development only!). "
            "Set ISOLATED_MASTER_PASSWORD_DB_URL in production for security isolation."
        )
        # Fallback to main database for development
        return str(settings.DATABASE_URL)
    
    return isolated_url


# Normalize the isolated database URL for asyncpg
ISOLATED_DB_URL = get_isolated_db_url()
if ISOLATED_DB_URL.startswith(("postgres://", "postgresql://")):
    ISOLATED_DB_URL = ISOLATED_DB_URL.replace("postgres://", "postgresql+asyncpg://", 1).replace(
        "postgresql://", "postgresql+asyncpg://", 1
    )


# ==============================================================================
# Isolated Async Engine & Session Factory
# ==============================================================================

connect_args = {
    "server_settings": {
        "application_name": "ArdhiAssets_MasterPassword_Isolated",
        "jit": "off",
        "statement_timeout": "5000",
    },
    "timeout": 10,
}

isolated_engine: AsyncEngine = create_async_engine(
    ISOLATED_DB_URL,
    echo=settings.ENV in ("development", "dev", "local"),
    future=True,
    pool_size=5,  # Smaller pool for isolated DB
    max_overflow=2,
    pool_pre_ping=True,
    connect_args=connect_args,
)

IsolatedAsyncSessionLocal = async_sessionmaker(
    bind=isolated_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ==============================================================================
# Dependency: Get Isolated DB Session
# ==============================================================================

async def get_isolated_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency injector for isolated database sessions.
    Provides secure, isolated connection for master password operations.
    """
    async with IsolatedAsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as exc:
            from fastapi import HTTPException
            if isinstance(exc, HTTPException) and exc.status_code in (401, 403):
                logger.debug(f"Auth error in isolated DB: {exc.detail}")
            else:
                logger.error(f"Isolated database session error: {exc}", exc_info=True)
            await session.rollback()
            raise
        finally:
            await session.close()


# ==============================================================================
# Database Initialization
# ==============================================================================

async def init_isolated_db() -> None:
    """
    Initialize the isolated master password database.
    Creates all tables for master password storage.
    """
    try:
        # Import isolated models to register them with IsolatedBase.metadata
        from app.models.isolated.master_password import MasterPassword  # noqa: F401
        
        # Create all tables in the isolated database
        async with isolated_engine.begin() as conn:
            await conn.run_sync(IsolatedBase.metadata.create_all)
        
        logger.info("✓ Isolated master password database initialized successfully.")
        
    except Exception as exc:
        logger.error(f"✗ Error initializing isolated database: {exc}", exc_info=True)
        raise


async def close_isolated_db() -> None:
    """Close isolated database connection pool"""
    await isolated_engine.dispose()
    logger.info("✓ Isolated database connection closed.")
