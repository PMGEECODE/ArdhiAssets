"""
Session cleanup job - removes expired sessions
Runs periodically to clean up old session records
"""

import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import AsyncSessionLocal
from app.services.session_service import session_service
from app.models.auth_models.user_session import UserSession

logger = logging.getLogger(__name__)

UTC = ZoneInfo("UTC")


async def cleanup_expired_sessions():
    """
    Enhanced cleanup: mark expired sessions as inactive and delete old ones
    Prevents session table bloat and ensures expired sessions can't be reused
    """
    try:
        async with AsyncSessionLocal() as db:
            now_utc = datetime.now(UTC)
            
            # First, mark active expired sessions as inactive
            stmt = select(UserSession).where(
                and_(
                    UserSession.is_active == True,
                    UserSession.expires_at <= now_utc,
                )
            )
            result = await db.execute(stmt)
            expired_sessions = result.scalars().all()
            
            count_marked = 0
            for session in expired_sessions:
                session.is_active = False
                session.invalidated_at = now_utc
                count_marked += 1
            
            if count_marked > 0:
                await db.commit()
                logger.info(f"Marked {count_marked} expired sessions as inactive")
            
            cutoff_date = now_utc - timedelta(days=30)
            stmt_delete = select(UserSession).where(
                and_(
                    UserSession.is_active == False,
                    UserSession.invalidated_at.is_not(None),
                    UserSession.invalidated_at <= cutoff_date,
                )
            )
            result = await db.execute(stmt_delete)
            old_sessions = result.scalars().all()
            
            count_deleted = 0
            for session in old_sessions:
                await db.delete(session)
                count_deleted += 1
            
            if count_deleted > 0:
                await db.commit()
                logger.info(f"Deleted {count_deleted} old invalidated sessions")
            
            logger.info(f"Session cleanup completed: marked {count_marked}, deleted {count_deleted}")
            
    except Exception as e:
        logger.error(f"Error in session cleanup: {e}")
        raise
