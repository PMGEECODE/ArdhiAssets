"""
Notification routes
Converted from Node.js notifications.js routes
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.auth_models.notification import Notification
from app.models.auth_models.user import User
from app.schemas.notification import (
    NotificationCreate, NotificationUpdate, NotificationResponse
)
from app.utils.generate_custom_id import generate_uuid

router = APIRouter()

@router.get("", response_model=List[NotificationResponse])
@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get notifications for authenticated user"""
    try:
        stmt = select(Notification).where(
            Notification.user_id == current_user.id
        ).order_by(Notification.created_at.desc())
        
        result = await db.execute(stmt)
        notifications = result.scalars().all()
        
        return notifications
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch notifications"
        )

@router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification_data: NotificationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new notification"""
    try:
        new_notification = Notification(
            id=generate_uuid(),
            user_id=notification_data.user_id,
            message=notification_data.message,
            link=notification_data.link
        )
        
        db.add(new_notification)
        await db.commit()
        await db.refresh(new_notification)
        
        return new_notification
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create notification"
        )

@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark a notification as read"""
    try:
        stmt = select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
        result = await db.execute(stmt)
        notification = result.scalar_one_or_none()
        
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        notification.read = True
        await db.commit()
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark as read"
        )

@router.put("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: str,
    notification_data: NotificationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a notification"""
    try:
        stmt = select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
        result = await db.execute(stmt)
        notification = result.scalar_one_or_none()
        
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        notification.read = notification_data.read
        await db.commit()
        await db.refresh(notification)
        
        return notification
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notification"
        )

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a notification"""
    try:
        stmt = select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
        result = await db.execute(stmt)
        notification = result.scalar_one_or_none()
        
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        await db.delete(notification)
        await db.commit()
        
        return {"message": "Notification deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete notification"
        )
