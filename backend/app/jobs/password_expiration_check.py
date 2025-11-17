"""
Password expiration check job
Converted from Node.js passwordExpirationCheck.js
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

async def check_password_expirations():
    """Check for users with passwords expiring in the next 2 days"""
    try:
        async with AsyncSessionLocal() as db:
            now = datetime.utcnow()
            warning_time = now + timedelta(days=2)  # Next 2 days
            
            # Find users with passwords expiring soon
            stmt = select(User).where(
                and_(
                    User.password_expiration <= warning_time,
                    User.password_expiration > now,
                    User.is_active == True
                )
            )
            result = await db.execute(stmt)
            users = result.scalars().all()
            
            logger.info(f"Found {len(users)} users with passwords expiring soon")
            
            for user in users:
                # Check if notification already exists
                existing_notification_stmt = select(Notification).where(
                    and_(
                        Notification.user_id == user.id,
                        Notification.message.like("%Your password is about to expire%")
                    )
                )
                existing_result = await db.execute(existing_notification_stmt)
                existing_notification = existing_result.scalar_one_or_none()
                
                if not existing_notification:
                    # Create password expiration notification
                    notification = Notification(
                        id=generate_uuid(),
                        user_id=user.id,
                        message="Your password is about to expire. Please update it soon.",
                        link="/settings/security"
                    )
                    
                    db.add(notification)
                    logger.info(f"Created password expiration notification for user {user.id}")
            
            await db.commit()
            logger.info("Password expiration check completed successfully")
            
    except Exception as e:
        logger.error(f"Error in password expiration check: {e}")
        raise
