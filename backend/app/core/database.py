"""
Database configuration and connection
Unified async SQLAlchemy setup with secure defaults.
Supports development and production environments.
"""

from typing import AsyncGenerator
import logging
from pathlib import Path

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
    AsyncEngine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import AsyncAdaptedQueuePool  # ← Correct pool for asyncpg

from app.core.config import settings

# ----------------------------------------------------------------------
# Logging
# ----------------------------------------------------------------------
logger = logging.getLogger(__name__)

# ----------------------------------------------------------------------
# 1. Normalize DATABASE_URL for asyncpg
# ----------------------------------------------------------------------
DATABASE_URL = str(settings.DATABASE_URL)

# Convert postgres:// or postgresql:// → postgresql+asyncpg://
if DATABASE_URL.startswith(("postgres://", "postgresql://")):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1).replace(
        "postgresql://", "postgresql+asyncpg://", 1
    )

# ----------------------------------------------------------------------
# 2. Unified & Safe Connect Args
# ----------------------------------------------------------------------
connect_args = {
    "server_settings": {
        "application_name": "ArdhiAssets_FastAPI",
        "jit": "off",
        "statement_timeout": "15000",          # increased from 5s → 15s
        "lock_timeout": "10000",
        "idle_in_transaction_session_timeout": "60000",
    },
    "timeout": 15,  # connection timeout
}

# ----------------------------------------------------------------------
# 3. Async Engine - Correct configuration for both dev & prod
# ----------------------------------------------------------------------
engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=settings.ENV != "production",   # echo only in dev/staging
    future=True,
    poolclass=AsyncAdaptedQueuePool,       # ← THE critical fix
    pool_size=20,                          # good default for most deployments
    max_overflow=40,                       # allows bursts
    pool_timeout=30,                       # wait max 30s for a connection
    pool_pre_ping=True,                    # validates connections before use → prevents "connection is closed"
    pool_recycle=3600,                     # recycle connections every hour → prevents stale/idle timeouts
    connect_args=connect_args,
)

# ----------------------------------------------------------------------
# 4. Async Session Factory
# ----------------------------------------------------------------------
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# ----------------------------------------------------------------------
# 5. Declarative Base
# ----------------------------------------------------------------------
class Base(DeclarativeBase):
    """Base class for all ORM models"""
    pass


# ----------------------------------------------------------------------
# 6. Dependency: Async DB Session (with proper commit/rollback)
# ----------------------------------------------------------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency injector for database sessions.
    Ensures proper commit/rollback and logging.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as exc:
            from fastapi import HTTPException
            if isinstance(exc, HTTPException) and exc.status_code in (401, 403):
                logger.debug(f"Auth error: {exc.detail}")
            else:
                logger.error(f"Database session error: {exc}", exc_info=True)
            await session.rollback()
            raise
        finally:
            await session.close()


# ----------------------------------------------------------------------
# 7. Initialize / Create Tables
# ----------------------------------------------------------------------
async def execute_migrations() -> None:
    """
    Execute all SQL migration files in the migrations/ folder.
    (Kept for compatibility - you can keep it commented if using Alembic)
    """
    migrations_dir = Path(__file__).parent.parent.parent / "migrations"

    if not migrations_dir.exists():
        logger.warning(f"⚠️  Migrations directory not found: {migrations_dir}")
        return

    migration_files = sorted(migrations_dir.glob("*.sql"))

    if not migration_files:
        logger.info("No migration files found.")
        return

    async with engine.begin() as conn:
        for migration_file in migration_files:
            logger.info(f"Executing migration: {migration_file.name}")
            try:
                with open(migration_file, "r") as f:
                    sql_content = f.read()

                # Simple statement splitting
                statements = [s.strip() for s in sql_content.split(";") if s.strip() and not s.strip().startswith("--")]

                success_count = 0
                for stmt in statements:
                    try:
                        await conn.exec_driver_sql(stmt)
                        success_count += 1
                    except Exception as e:
                        logger.error(f"Error in {migration_file.name}: {e}")
                logger.info(f"Completed {migration_file.name}: {success_count}/{len(statements)} statements")
            except Exception as e:
                logger.error(f"Failed to read/execute {migration_file.name}: {e}")

    logger.info("All migrations processed.")


async def init_db() -> None:
    """
    Initialize the database - run migrations and create tables.
    """
    try:
        # await execute_migrations()  # uncomment if you use raw SQL migrations

        # Import all models so they are registered with Base.metadata
        from app.models.auth_models import (  
            User, audit_log, Role, Permission, backup, RolePermission,
            RefreshToken, Session, FailedLoginAttempt, MFASecret,
            user_role, user_session, notification, system_setting,
            asset_category_permission,
        )
        from app.models import (
            building, approval_request, furniture_equipment,
            furniture_equipment_transfer, ict_asset, ict_asset_transfer,
            land_asset, office_equipment, office_equipment_transfer,
            plant_machinery, plant_machinery_transfer, portable_item,
            portable_item_transfer, vehicle,
        )

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        logger.info("Database tables created/verified successfully.")

        from app.services.init_default_data import init_default_data
        async with AsyncSessionLocal() as session:
            await init_default_data(session)

    except Exception as exc:
        logger.error(f"Error initializing database: {exc}", exc_info=True)
        raise