# """
# Session management service - handles multi-device session validation
# Prevents multiple simultaneous logins from different devices
# """

# import hashlib
# from datetime import datetime, timedelta
# from typing import Optional, Dict, Any
# from zoneinfo import ZoneInfo
# from sqlalchemy import select, and_
# from sqlalchemy.ext.asyncio import AsyncSession

# from app.models.auth_models.user_session import UserSession
# from app.core.config import settings
# from app.utils.generate_custom_id import generate_uuid

# UTC = ZoneInfo("UTC")

# class SessionService:
#     """Service for managing user sessions and device tracking"""

#     @staticmethod
#     def hash_token(token: str) -> str:
#         """Hash token for secure storage"""
#         return hashlib.sha256(token.encode()).hexdigest()

#     @staticmethod
#     async def create_session(
#         db: AsyncSession,
#         user_id: str,
#         access_token: str,
#         refresh_token: str,
#         device_metadata: Dict[str, Any],
#         ip_address: str,
#         user_agent: str,
#         session_timeout_minutes: int,  # Accept user's session timeout
#     ) -> UserSession:
#         """
#         Create a new user session with device metadata
        
#         Args:
#             db: Database session
#             user_id: User ID
#             access_token: JWT access token
#             refresh_token: JWT refresh token
#             device_metadata: Device information (device_id, device_name, device_type, browser, etc.)
#             ip_address: Client IP address
#             user_agent: Client user agent string
#             session_timeout_minutes: User's session timeout (from users.session_timeout). Overrides default.
#         """
#         session_id = generate_uuid()
#         now_utc = datetime.now(UTC)
        
#         timeout_minutes = session_timeout_minutes or settings.DEFAULT_SESSION_TIMEOUT
#         expires_at = now_utc + timedelta(minutes=timeout_minutes)

#         session = UserSession(
#             id=session_id,
#             user_id=user_id,
#             token_hash=SessionService.hash_token(access_token),
#             refresh_token_hash=SessionService.hash_token(refresh_token),
#             device_id=device_metadata.get("device_id", "unknown"),
#             device_name=device_metadata.get("device_name", "Unknown Device"),
#             device_type=device_metadata.get("device_type", "desktop"),
#             browser=device_metadata.get("browser", "Unknown"),
#             browser_version=device_metadata.get("browser_version", "Unknown"),
#             os=device_metadata.get("os", "Unknown"),
#             os_version=device_metadata.get("os_version", "Unknown"),
#             ip_address=ip_address,
#             user_agent=user_agent,
#             expires_at=expires_at,
#         )

#         db.add(session)
#         await db.commit()
#         await db.refresh(session)
#         return session

#     @staticmethod
#     async def get_active_sessions(
#         db: AsyncSession,
#         user_id: Optional[str] = None,
#     ) -> list[UserSession]:
#         """Get all active sessions. If user_id is provided, filter by that user."""
#         now_utc = datetime.now(UTC)
#         stmt = select(UserSession).where(
#             and_(
#                 UserSession.is_active == True,
#                 UserSession.expires_at > now_utc,
#             )
#         )
#         if user_id:
#             stmt = stmt.where(UserSession.user_id == user_id)

#         result = await db.execute(stmt)
#         return list(result.scalars().all())

#     @staticmethod
#     async def check_device_conflict(
#         db: AsyncSession,
#         user_id: str,
#         device_id: str,
#     ) -> Optional[UserSession]:
#         """
#         Check if user has an active session from a different device
        
#         Returns:
#             Existing session if found, None otherwise
#         """
#         active_sessions = await SessionService.get_active_sessions(db, user_id)
        
#         for session in active_sessions:
#             if session.device_id != device_id:
#                 return session
        
#         return None

#     @staticmethod
#     async def invalidate_session(
#         db: AsyncSession,
#         session_id: str,
#     ) -> bool:
#         """Invalidate a specific session"""
#         stmt = select(UserSession).where(UserSession.id == session_id)
#         result = await db.execute(stmt)
#         session = result.scalar_one_or_none()
        
#         if session:
#             session.invalidate()
#             await db.commit()
#             return True
        
#         return False

#     @staticmethod
#     async def invalidate_all_sessions(
#         db: AsyncSession,
#         user_id: str,
#     ) -> int:
#         """Invalidate all sessions for a user (logout from all devices)"""
#         stmt = select(UserSession).where(
#             and_(
#                 UserSession.user_id == user_id,
#                 UserSession.is_active == True,
#             )
#         )
#         result = await db.execute(stmt)
#         sessions = result.scalars().all()
        
#         count = 0
#         for session in sessions:
#             session.invalidate()
#             count += 1
        
#         await db.commit()
#         return count

#     @staticmethod
#     async def invalidate_other_sessions(
#         db: AsyncSession,
#         user_id: str,
#         current_session_id: str,
#     ) -> int:
#         """Invalidate all other sessions for a user (keep current session active)"""
#         stmt = select(UserSession).where(
#             and_(
#                 UserSession.user_id == user_id,
#                 UserSession.id != current_session_id,
#                 UserSession.is_active == True,
#             )
#         )
#         result = await db.execute(stmt)
#         sessions = result.scalars().all()
        
#         count = 0
#         for session in sessions:
#             session.invalidate()
#             count += 1
        
#         await db.commit()
#         return count

#     @staticmethod
#     async def validate_token(
#         db: AsyncSession,
#         user_id: str,
#         token: str,
#     ) -> Optional[UserSession]:
#         """Validate if token belongs to an active session"""
#         token_hash = SessionService.hash_token(token)
#         now_utc = datetime.now(UTC)
        
#         stmt = select(UserSession).where(
#             and_(
#                 UserSession.user_id == user_id,
#                 UserSession.token_hash == token_hash,
#                 UserSession.is_active == True,
#                 UserSession.expires_at > now_utc,
#             )
#         )
#         result = await db.execute(stmt)
#         session = result.scalar_one_or_none()
        
#         if session:
#             session.update_activity()
#             await db.commit()
        
#         return session

#     @staticmethod
#     async def cleanup_expired_sessions(db: AsyncSession) -> int:
#         """Clean up expired sessions"""
#         now_utc = datetime.now(UTC)
#         stmt = select(UserSession).where(
#             and_(
#                 UserSession.is_active == True,
#                 UserSession.expires_at <= now_utc,
#             )
#         )
#         result = await db.execute(stmt)
#         sessions = result.scalars().all()
        
#         count = 0
#         for session in sessions:
#             session.invalidate()
#             count += 1
        
#         await db.commit()
#         return count

#     @staticmethod
#     async def get_session_by_id(
#         db: AsyncSession,
#         session_id: str,
#     ) -> Optional[UserSession]:
#         """Get a session by its ID"""
#         stmt = select(UserSession).where(UserSession.id == session_id)
#         result = await db.execute(stmt)
#         return result.scalar_one_or_none()

#     @staticmethod
#     async def get_session_by_device(
#         db: AsyncSession,
#         user_id: str,
#         device_id: str,
#     ) -> Optional[UserSession]:
#         """
#         Get active session for user from specific device
#         Returns the existing session if found, None otherwise
#         """
#         now_utc = datetime.now(UTC)
#         stmt = select(UserSession).where(
#             and_(
#                 UserSession.user_id == user_id,
#                 UserSession.device_id == device_id,
#                 UserSession.is_active == True,
#                 UserSession.expires_at > now_utc,
#             )
#         )
#         result = await db.execute(stmt)
#         return result.scalar_one_or_none()

#     @staticmethod
#     async def reuse_session(
#         db: AsyncSession,
#         session: UserSession,
#         access_token: str,
#         refresh_token: str,
#         session_timeout_minutes: int,
#     ) -> UserSession:
#         """
#         Update existing session instead of creating new one
        
#         Reuses an existing session by updating tokens and expiration time.
#         This prevents session table bloat when users log in repeatedly from the same device.
        
#         Args:
#             db: Database session
#             session: Existing UserSession to reuse
#             access_token: New JWT access token
#             refresh_token: New JWT refresh token
#             session_timeout_minutes: Session timeout duration in minutes
            
#         Returns:
#             Updated UserSession
#         """
#         now_utc = datetime.now(UTC)
        
#         # Update session with new tokens and expiration
#         session.token_hash = SessionService.hash_token(access_token)
#         session.refresh_token_hash = SessionService.hash_token(refresh_token)
#         session.expires_at = now_utc + timedelta(minutes=session_timeout_minutes)
#         session.last_activity = now_utc
#         session.is_active = True
#         session.invalidated_at = None
        
#         await db.commit()
#         await db.refresh(session)
#         return session

#     @staticmethod
#     async def invalidate_current_session(
#         db: AsyncSession,
#         user_id: str,
#         session_id: str,
#     ) -> bool:
#         """
#         Invalidate only the current session for a specific user.
#         This is the correct method to use on logout to avoid clearing all sessions.
        
#         Args:
#             db: Database session
#             user_id: User ID
#             session_id: Session ID to invalidate
            
#         Returns:
#             True if session was invalidated, False otherwise
#         """
#         stmt = select(UserSession).where(
#             and_(
#                 UserSession.id == session_id,
#                 UserSession.user_id == user_id,
#                 UserSession.is_active == True,
#             )
#         )
#         result = await db.execute(stmt)
#         session = result.scalar_one_or_none()
        
#         if session:
#             session.invalidate()
#             await db.commit()
#             return True
        
#         return False


# session_service = SessionService()


"""
Session management service - handles multi-device session validation
Prevents multiple simultaneous logins from different devices
"""

import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from zoneinfo import ZoneInfo
from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth_models.user_session import UserSession
from app.models.auth_models.refresh_token import RefreshToken
from app.core.config import settings
from app.utils.generate_custom_id import generate_uuid

UTC = ZoneInfo("UTC")

class SessionService:
    """Service for managing user sessions and device tracking"""

    @staticmethod
    def hash_token(token: str) -> str:
        """Hash token for secure storage"""
        return hashlib.sha256(token.encode()).hexdigest()

    @staticmethod
    async def create_session(
        db: AsyncSession,
        user_id: str,
        access_token: str,
        refresh_token: str,
        device_metadata: Dict[str, Any],
        ip_address: str,
        user_agent: str,
        session_timeout_minutes: int,  # Accept user's session timeout
    ) -> UserSession:
        """
        Create a new user session with device metadata
        
        Args:
            db: Database session
            user_id: User ID
            access_token: JWT access token
            refresh_token: JWT refresh token
            device_metadata: Device information (device_id, device_name, device_type, browser, etc.)
            ip_address: Client IP address
            user_agent: Client user agent string
            session_timeout_minutes: User's session timeout (from users.session_timeout). Overrides default.
        """
        session_id = generate_uuid()
        now_utc = datetime.now(UTC)
        
        timeout_minutes = session_timeout_minutes or settings.DEFAULT_SESSION_TIMEOUT
        expires_at = now_utc + timedelta(minutes=timeout_minutes)

        session = UserSession(
            id=session_id,
            user_id=user_id,
            token_hash=SessionService.hash_token(access_token),
            refresh_token_hash=SessionService.hash_token(refresh_token),
            device_id=device_metadata.get("device_id", "unknown"),
            device_name=device_metadata.get("device_name", "Unknown Device"),
            device_type=device_metadata.get("device_type", "desktop"),
            browser=device_metadata.get("browser", "Unknown"),
            browser_version=device_metadata.get("browser_version", "Unknown"),
            os=device_metadata.get("os", "Unknown"),
            os_version=device_metadata.get("os_version", "Unknown"),
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=expires_at,
        )

        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def get_active_sessions(
        db: AsyncSession,
        user_id: Optional[str] = None,
    ) -> list[UserSession]:
        """Get all active sessions. If user_id is provided, filter by that user."""
        now_utc = datetime.now(UTC)
        stmt = select(UserSession).where(
            and_(
                UserSession.is_active == True,
                UserSession.expires_at > now_utc,
            )
        )
        if user_id:
            stmt = stmt.where(UserSession.user_id == user_id)

        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def check_device_conflict(
        db: AsyncSession,
        user_id: str,
        device_id: str,
    ) -> Optional[UserSession]:
        """
        Check if user has an active session from a different device
        
        Returns:
            Existing session if found, None otherwise
        """
        active_sessions = await SessionService.get_active_sessions(db, user_id)
        
        for session in active_sessions:
            if session.device_id != device_id:
                return session
        
        return None

    @staticmethod
    async def invalidate_session(
        db: AsyncSession,
        session_id: str,
    ) -> bool:
        """Invalidate a specific session"""
        stmt = select(UserSession).where(UserSession.id == session_id)
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()
        
        if session:
            session.invalidate()
            await db.commit()
            return True
        
        return False

    @staticmethod
    async def invalidate_all_sessions(
        db: AsyncSession,
        user_id: str,
    ) -> int:
        """Invalidate all sessions for a user (logout from all devices)"""
        stmt = select(UserSession).where(
            and_(
                UserSession.user_id == user_id,
                UserSession.is_active == True,
            )
        )
        result = await db.execute(stmt)
        sessions = result.scalars().all()
        
        count = 0
        for session in sessions:
            session.invalidate()
            count += 1
        
        await db.commit()
        return count

    @staticmethod
    async def invalidate_other_sessions(
        db: AsyncSession,
        user_id: str,
        current_session_id: str,
    ) -> int:
        """Invalidate all other sessions for a user (keep current session active)"""
        stmt = select(UserSession).where(
            and_(
                UserSession.user_id == user_id,
                UserSession.id != current_session_id,
                UserSession.is_active == True,
            )
        )
        result = await db.execute(stmt)
        sessions = result.scalars().all()
        
        count = 0
        for session in sessions:
            session.invalidate()
            count += 1
        
        await db.commit()
        return count

    @staticmethod
    async def validate_token(
        db: AsyncSession,
        user_id: str,
        token: str,
    ) -> Optional[UserSession]:
        """Validate if token belongs to an active session"""
        token_hash = SessionService.hash_token(token)
        now_utc = datetime.now(UTC)
        
        stmt = select(UserSession).where(
            and_(
                UserSession.user_id == user_id,
                UserSession.token_hash == token_hash,
                UserSession.is_active == True,
                UserSession.expires_at > now_utc,
            )
        )
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()
        
        if session:
            session.update_activity()
            await db.commit()
        
        return session

    @staticmethod
    async def cleanup_expired_sessions(db: AsyncSession) -> int:
        """Clean up expired sessions"""
        now_utc = datetime.now(UTC)
        stmt = select(UserSession).where(
            and_(
                UserSession.is_active == True,
                UserSession.expires_at <= now_utc,
            )
        )
        result = await db.execute(stmt)
        sessions = result.scalars().all()
        
        count = 0
        for session in sessions:
            session.invalidate()
            count += 1
        
        await db.commit()
        return count

    @staticmethod
    async def get_session_by_id(
        db: AsyncSession,
        session_id: str,
    ) -> Optional[UserSession]:
        """Get a session by its ID"""
        stmt = select(UserSession).where(UserSession.id == session_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_session_by_device(
        db: AsyncSession,
        user_id: str,
        device_id: str,
    ) -> Optional[UserSession]:
        """
        Get active session for user from specific device
        Returns the existing session if found, None otherwise
        """
        now_utc = datetime.now(UTC)
        stmt = select(UserSession).where(
            and_(
                UserSession.user_id == user_id,
                UserSession.device_id == device_id,
                UserSession.is_active == True,
                UserSession.expires_at > now_utc,
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def reuse_session(
        db: AsyncSession,
        session: UserSession,
        access_token: str,
        refresh_token: str,
        session_timeout_minutes: int,
    ) -> UserSession:
        """
        Update existing session instead of creating new one
        
        Reuses an existing session by updating tokens and expiration time.
        This prevents session table bloat when users log in repeatedly from the same device.
        
        Args:
            db: Database session
            session: Existing UserSession to reuse
            access_token: New JWT access token
            refresh_token: New JWT refresh token
            session_timeout_minutes: Session timeout duration in minutes
            
        Returns:
            Updated UserSession
        """
        now_utc = datetime.now(UTC)
        
        # Update session with new tokens and expiration
        session.token_hash = SessionService.hash_token(access_token)
        session.refresh_token_hash = SessionService.hash_token(refresh_token)
        session.expires_at = now_utc + timedelta(minutes=session_timeout_minutes)
        session.last_activity = now_utc
        session.is_active = True
        session.invalidated_at = None
        
        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def invalidate_current_session(
        db: AsyncSession,
        user_id: str,
        session_id: str,
    ) -> bool:
        """
        Invalidate only the current session for a specific user.
        This is the correct method to use on logout to avoid clearing all sessions.
        
        Args:
            db: Database session
            user_id: User ID
            session_id: Session ID to invalidate
            
        Returns:
            True if session was invalidated, False otherwise
        """
        stmt = select(UserSession).where(
            and_(
                UserSession.id == session_id,
                UserSession.user_id == user_id,
                UserSession.is_active == True,
            )
        )
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()
        
        if session:
            session.invalidate()
            await db.commit()
            return True
        
        return False

    @staticmethod
    async def delete_session_and_tokens(
        db: AsyncSession,
        session_id: str,
    ) -> bool:
        """
        Delete session and all associated refresh tokens completely
        
        This removes the session from users_session table and any refresh tokens 
        tied to that user from the refresh_tokens table. Used by admin to terminate 
        user sessions.
        
        Args:
            db: Database session
            session_id: Session ID to delete
            
        Returns:
            True if deletion successful, False if session not found
        """
        stmt = select(UserSession).where(UserSession.id == session_id)
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()
        
        if not session:
            return False
        
        user_id = str(session.user_id)
        
        stmt = delete(RefreshToken).where(
            RefreshToken.user_id == user_id
        )
        await db.execute(stmt)
        
        stmt = delete(UserSession).where(UserSession.id == session_id)
        await db.execute(stmt)
        
        await db.commit()
        return True


session_service = SessionService()
