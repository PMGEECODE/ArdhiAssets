"""
Migration script: Add backup progress tracking fields
Adds progress_percentage and progress_message columns to backups table
"""
import asyncio
from sqlalchemy import text
from app.core.database import get_db_async_engine

async def run_migration():
    """Run the migration to add progress tracking columns."""
    engine = await get_db_async_engine()
    
    async with engine.begin() as conn:
        # Check if columns already exist
        result = await conn.execute(
            text("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'backups' AND column_name IN ('progress_percentage', 'progress_message')
            """)
        )
        existing = result.fetchall()
        
        if not existing or len(existing) < 2:
            print("Adding progress tracking columns to backups table...")
            
            # Add progress_percentage column
            try:
                await conn.execute(
                    text("""
                        ALTER TABLE backups 
                        ADD COLUMN progress_percentage INTEGER DEFAULT 0 NOT NULL
                    """)
                )
                print("✅ Added progress_percentage column")
            except Exception as e:
                if "already exists" in str(e):
                    print("⚠️ progress_percentage column already exists")
                else:
                    raise
            
            # Add progress_message column
            try:
                await conn.execute(
                    text("""
                        ALTER TABLE backups 
                        ADD COLUMN progress_message VARCHAR(255)
                    """)
                )
                print("✅ Added progress_message column")
            except Exception as e:
                if "already exists" in str(e):
                    print("⚠️ progress_message column already exists")
                else:
                    raise
            
            await conn.commit()
            print("✅ Migration completed successfully")
        else:
            print("⚠️ Progress tracking columns already exist, skipping migration")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_migration())
