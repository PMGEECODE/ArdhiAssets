"""
Migration script to create user_sessions table for multi-device session tracking
Run this script to set up the new session management system
"""

import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal


async def create_user_sessions_table():
    """Create user_sessions table"""
    async with AsyncSessionLocal() as db:
        try:
            # Create table
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id VARCHAR(50) PRIMARY KEY,
                    user_id VARCHAR(50) NOT NULL,
                    token_hash VARCHAR(255) NOT NULL UNIQUE,
                    refresh_token_hash VARCHAR(255),
                    device_id VARCHAR(100) NOT NULL,
                    device_name VARCHAR(255) NOT NULL,
                    device_type VARCHAR(50) NOT NULL,
                    browser VARCHAR(100) NOT NULL,
                    browser_version VARCHAR(50) NOT NULL,
                    os VARCHAR(100) NOT NULL,
                    os_version VARCHAR(50) NOT NULL,
                    ip_address VARCHAR(45) NOT NULL,
                    user_agent TEXT NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    last_activity DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME NOT NULL,
                    invalidated_at DATETIME,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    INDEX ix_user_sessions_user_id (user_id),
                    INDEX ix_user_sessions_token_hash (token_hash),
                    INDEX ix_user_sessions_is_active (is_active)
                )
            """))
            
            await db.commit()
            print("✅ user_sessions table created successfully")
            
        except Exception as e:
            print(f"❌ Error creating table: {e}")
            await db.rollback()


async def main():
    """Run migration"""
    print("Starting user_sessions table migration...")
    await create_user_sessions_table()
    print("Migration completed!")


if __name__ == "__main__":
    asyncio.run(main())
