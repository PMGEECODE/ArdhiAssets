# -*- coding: utf-8 -*-
# /// app/jobs/session_timeout_check.py

"""
Session timeout check job
Converted from Node.js sessionTimeoutCheck.js
"""

import logging
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import AsyncSessionLocal
from app.models.auth_models.user import User
from app.models.auth_models.notification import Notification
from app.utils.generate_custom_id import generate_uuid

logger = logging.getLogger(__name__)

async def check_session_expirations():
    """Check for users with sessions about to expire"""
    try:
        async with AsyncSessionLocal() as db:
            now = datetime.utcnow()
            
            # Find active users with session timeout settings and recent login
            stmt = select(User).where(
                and_(
                    User.is_active == True,
                    User.session_timeout.is_not(None),
                    User.last_login.is_not(None)
                )
            )
            result = await db.execute(stmt)
            users = result.scalars().all()
            
            logger.info(f"Checking session timeouts for {len(users)} users")
            
            for user in users:
                # Calculate session expiration time
                session_expiration = user.last_login + timedelta(minutes=user.session_timeout)
                warning_threshold = session_expiration - timedelta(minutes=15)  # 15 minutes before expiration
                
                # Check if we should warn about session expiration
                if now >= warning_threshold and now < session_expiration:
                    # Check if we already sent a notification in the last hour
                    one_hour_ago = now - timedelta(hours=1)
                    existing_notification_stmt = select(Notification).where(
                        and_(
                            Notification.user_id == user.id,
                            Notification.message.like("%Your session is about to expire%"),
                            Notification.created_at >= one_hour_ago
                        )
                    )
                    existing_result = await db.execute(existing_notification_stmt)
                    existing_notification = existing_result.scalar_one_or_none()
                    
                    if not existing_notification:
                        # Create session expiration warning notification
                        notification = Notification(
                            id=generate_uuid(),
                            user_id=user.id,
                            message="Your session is about to expire soon. Please save your work.",
                            link="/dashboard"
                        )
                        
                        db.add(notification)
                        logger.info(f"Created session expiration warning for user {user.id}")
            
            await db.commit()
            logger.info("Session timeout check completed successfully")
            
    except Exception as e:
        logger.error(f"Error in session timeout check: {e}")
        raise
