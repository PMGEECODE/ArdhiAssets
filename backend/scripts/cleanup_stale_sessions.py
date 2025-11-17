"""
Migration script to clean up stale and duplicate sessions
- Invalidates expired sessions
- Removes duplicate sessions for the same user+device (keeps most recent)
- Logs all cleanup actions
"""

import asyncio
import logging
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.auth_models.user_session import UserSession

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

UTC = ZoneInfo("UTC")


async def cleanup_stale_sessions():
    """Clean up expired and duplicate sessions"""
    async with AsyncSessionLocal() as db:
        now = datetime.now(UTC)
        
        # 1. Find and invalidate expired sessions
        logger.info("Starting cleanup of expired sessions...")
        expired_stmt = select(UserSession).where(
            and_(
                UserSession.is_active == True,
                UserSession.expires_at <= now
            )
        )
        result = await db.execute(expired_stmt)
        expired_sessions = result.scalars().all()
        
        expired_count = 0
        for session in expired_sessions:
            session.invalidate()
            expired_count += 1
        
        if expired_count > 0:
            await db.commit()
            logger.info(f"Invalidated {expired_count} expired sessions")
        
        # 2. Find and remove duplicate sessions for same user+device
        logger.info("Starting cleanup of duplicate sessions...")
        
        # Get all user+device combinations with multiple active sessions
        dup_query = select(
            UserSession.user_id,
            UserSession.device_id,
            func.count(UserSession.id).label("session_count")
        ).where(
            and_(
                UserSession.is_active == True,
                UserSession.expires_at > now
            )
        ).group_by(
            UserSession.user_id,
            UserSession.device_id
        ).having(
            func.count(UserSession.id) > 1
        )
        
        result = await db.execute(dup_query)
        duplicates = result.all()
        
        duplicate_count = 0
        for user_id, device_id, count in duplicates:
            # Get all sessions for this user+device, ordered by creation (newest first)
            sessions_stmt = select(UserSession).where(
                and_(
                    UserSession.user_id == user_id,
                    UserSession.device_id == device_id,
                    UserSession.is_active == True,
                    UserSession.expires_at > now
                )
            ).order_by(UserSession.created_at.desc())
            
            result = await db.execute(sessions_stmt)
            sessions = result.scalars().all()
            
            # Keep the first (most recent) and invalidate the rest
            if sessions:
                for old_session in sessions[1:]:
                    old_session.invalidate()
                    duplicate_count += 1
                    logger.info(
                        f"Invalidated duplicate session {old_session.id} for "
                        f"user {user_id} on device {device_id}"
                    )
        
        if duplicate_count > 0:
            await db.commit()
            logger.info(f"Invalidated {duplicate_count} duplicate sessions")
        
        logger.info("Session cleanup completed successfully")
        logger.info(f"Summary: {expired_count} expired, {duplicate_count} duplicate sessions cleaned up")


async def main():
    """Run cleanup"""
    try:
        await cleanup_stale_sessions()
    except Exception as e:
        logger.error(f"Error during session cleanup: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
