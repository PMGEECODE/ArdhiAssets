"""
Security dependencies for session validation
Ensures all protected endpoints validate the user's session in the database
"""

from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime
from zoneinfo import ZoneInfo

from app.core.database import get_db
from app.core.security import verify_token, decode_access_token
from app.models.auth_models.user import User
from app.models.auth_models.user_session import UserSession

UTC = ZoneInfo("UTC")


async def get_current_user_with_session(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    New dependency that validates BOTH the JWT token AND the session in the database.
    This ensures users are logged out if their session has expired, regardless of JWT validity.
    
    Returns user data only if:
    1. JWT token is valid
    2. Session exists in database
    3. Session is active (is_active = true)
    4. Session has not expired (expires_at > now)
    5. Session has not been invalidated
    
    If session is expired, marks it as inactive in the database.
    """
    # Get access token from cookie
    access_token = request.cookies.get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token not found"
        )
    
    # Decode JWT token
    try:
        payload = decode_access_token(access_token)
        if not payload or payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    # Fetch user
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Validate session in database
    now = datetime.now(UTC)
    stmt = select(UserSession).where(
        and_(
            UserSession.user_id == user_id,
            UserSession.token_hash == access_token.split('.')[-1][:64],  # Match token to session
            UserSession.is_active == True,
        )
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    
    if not session:
        # No session found, user must login again
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session not found. Please login again."
        )
    
    # Check if session has expired
    if session.expires_at < now:
        # Session expired - mark as inactive in database
        session.is_active = False
        session.invalidated_at = now
        await db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please login again."
        )
    
    # Check if session was explicitly invalidated
    if session.invalidated_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been invalidated. Please login again."
        )
    
    # Session is valid - update activity timestamp
    session.last_activity = now
    await db.commit()
    
    return {"user": user, "session": session}
