"""
Database migration script
"""

import asyncio
import sys
from alembic.config import Config
from alembic import command
from app.core.config import settings

async def run_migrations():
    """Run database migrations"""
    try:
        # Create Alembic configuration
        alembic_cfg = Config("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
        
        # Run migrations
        command.upgrade(alembic_cfg, "head")
        print("✅ Database migrations completed successfully")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_migrations())
