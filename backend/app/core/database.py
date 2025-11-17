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
# 2. Async Engine (Secure & Configurable)
# ----------------------------------------------------------------------
connect_args = {
    "server_settings": {
        "application_name": "ArdhiAssets_FastAPI",
        "jit": "off",
        "statement_timeout": "5000",
        "lock_timeout": "5000",
        "idle_in_transaction_session_timeout": "60000",
    },
    "timeout": 10,
}

engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=settings.ENV in ("development", "dev", "local"),
    future=True,
    pool_size=20 if settings.ENV != "production" else 0,
    max_overflow=10 if settings.ENV != "production" else 0,
    poolclass=None if settings.ENV != "production" else __import__("sqlalchemy.pool", fromlist=["NullPool"]).NullPool,
    pool_pre_ping=True,
    connect_args=connect_args if settings.ENV == "production" else {"server_settings": {"application_name": "DeviceMS_FastAPI"}},
)

# ----------------------------------------------------------------------
# 3. Async Session Factory
# ----------------------------------------------------------------------
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# ----------------------------------------------------------------------
# 4. Declarative Base
# ----------------------------------------------------------------------
class Base(DeclarativeBase):
    """Base class for all ORM models"""
    pass


# ----------------------------------------------------------------------
# 5. Dependency: Async DB Session (with commit/rollback)
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
                # These are expected authentication/authorization errors, log gracefully
                logger.debug(f"Auth error: {exc.detail}")
            else:
                # Log other errors with full context
                logger.error(f"Database session error: {exc}", exc_info=True)
            await session.rollback()
            raise
        finally:
            await session.close()


# ----------------------------------------------------------------------
# 6. Initialize / Create Tables
# ----------------------------------------------------------------------
async def execute_migrations() -> None:
    """
    Execute all SQL migration files in the migrations/ folder.

    - Runs each .sql file in order.
    - Skips and logs any failed file or statement.
    - Continues executing remaining migrations to avoid full stop.
    """
    migrations_dir = Path(__file__).parent.parent.parent / "migrations"

    if not migrations_dir.exists():
        logger.warning(f"⚠️  Migrations directory not found: {migrations_dir}")
        return

    # Sort migrations to maintain execution order
    migration_files = sorted(migrations_dir.glob("*.sql"))

    if not migration_files:
        logger.info("No migration files found.")
        return

    async with engine.begin() as conn:
        for migration_file in migration_files:
            logger.info(f"⏳ Executing migration: {migration_file.name}")

            try:
                with open(migration_file, "r") as f:
                    sql_content = f.read()
            except Exception as read_exc:
                logger.error(f"⚠️  Failed to read migration {migration_file.name}: {read_exc}")
                continue  # skip this file entirely

            # Simple split for individual SQL statements (ignores comments)
            statements = []
            current_statement = []

            for line in sql_content.splitlines():
                stripped = line.strip()
                if not stripped or stripped.startswith("--"):
                    continue
                current_statement.append(stripped)
                if ";" in stripped:
                    statement = " ".join(current_statement).rstrip(";").strip()
                    if statement:
                        statements.append(statement)
                    current_statement = []

            if current_statement:
                # Add last partial statement if not terminated with semicolon
                statement = " ".join(current_statement).rstrip(";").strip()
                if statement:
                    statements.append(statement)

            # Execute statements one by one
            success_count = 0
            for idx, statement in enumerate(statements, 1):
                try:
                    await conn.exec_driver_sql(statement)
                    success_count += 1
                except Exception as stmt_exc:
                    logger.error(
                        f"❌ Error executing statement {idx} in {migration_file.name}: {stmt_exc}"
                    )
                    continue  # skip failed statement but keep going

            logger.info(
                f"✅ Completed migration: {migration_file.name} "
                f"({success_count}/{len(statements)} statements executed)"
            )

    logger.info("🎉 All migrations processed (errors were skipped if encountered).")

async def init_db() -> None:
    """
    Initialize the database by running migrations and creating all tables.
    Imports all models to register them with Base.metadata.
    This is the single source of truth for database initialization.
    """
    try:
        # Execute migration SQL files first
        await execute_migrations()
        
        # Import all auth models to register them with Base.metadata
        from app.models.auth_models import (  # noqa: F401
            User,
            audit_log,
            Role,
            Permission,
            backup,
            RolePermission,
            RefreshToken,
            Session,
            FailedLoginAttempt,
            MFASecret,
            user_role,
            user_session,
            notification,
            system_setting,
            asset_category_permission,
        )
        
        # Import all asset and core models to register them with Base.metadata
        from app.models import (  # noqa: F401
            building,
            approval_request,
            furniture_equipment,
            furniture_equipment_transfer,
            ict_asset,
            ict_asset_transfer,
            land_asset,
            office_equipment,
            office_equipment_transfer,
            plant_machinery,
            plant_machinery_transfer,
            portable_item,
            portable_item_transfer,
            vehicle,
        )

        # Create all tables in a single transaction
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        logger.info("✓ Database initialized successfully. All tables created/verified.")
        
        from app.services.init_default_data import init_default_data
        async with AsyncSessionLocal() as session:
            await init_default_data(session)
            
    except Exception as exc:
        logger.error(f"✗ Error initializing database: {exc}", exc_info=True)
        raise
