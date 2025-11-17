# """
# Audit log routes
# Converted from Node.js audit.js routes
# """

# from typing import List, Optional
# from datetime import datetime
# from fastapi import APIRouter, Depends, HTTPException, status, Query
# from fastapi.responses import StreamingResponse
# from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy import select, and_, func
# from sqlalchemy.orm import selectinload
# import io
# import csv

# from app.core.database import get_db
# from app.core.deps import require_admin
# from app.models.auth_models.audit_log import AuditLog
# from app.models.auth_models.user import User
# from app.schemas.audit_log import AuditLogResponse
# from app.utils.generate_custom_id import generate_uuid

# router = APIRouter()

# @router.get("/", response_model=List[AuditLogResponse])
# async def get_audit_logs(
#     user_id: Optional[str] = Query(None, description="Filter by user ID"),
#     action: Optional[str] = Query(None, description="Filter by action"),
#     username: Optional[str] = Query(None, description="Filter by username"),
#     entity_type: Optional[str] = Query(None, description="Filter by entity type"),
#     start_date: Optional[datetime] = Query(None, description="Start date filter"),
#     end_date: Optional[datetime] = Query(None, description="End date filter"),
#     limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
#     offset: int = Query(0, ge=0, description="Number of records to skip"),
#     current_user: User = Depends(require_admin),
#     db: AsyncSession = Depends(get_db)
# ):
#     """Get all audit logs with filtering options (admin only)"""
#     try:
#         # Build filter conditions
#         conditions = []
        
#         if user_id:
#             conditions.append(AuditLog.user_id == user_id)
        
#         if action:
#             conditions.append(AuditLog.action == action)
            
#         if username:
#             conditions.append(AuditLog.user.has(User.username == username))
        
#         if entity_type:
#             conditions.append(AuditLog.entity_type == entity_type)
        
#         if start_date:
#             conditions.append(AuditLog.timestamp >= start_date)
        
#         if end_date:
#             conditions.append(AuditLog.timestamp <= end_date)
        
#         # Build query
#         stmt = select(AuditLog).options(selectinload(AuditLog.user))
        
#         if conditions:
#             stmt = stmt.where(and_(*conditions))
        
#         stmt = stmt.order_by(AuditLog.timestamp.desc()).limit(limit).offset(offset)
        
#         result = await db.execute(stmt)
#         audit_logs = result.scalars().all()
        
#         return audit_logs
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail="Failed to fetch audit logs"
#         )

# @router.get("/user/{user_id}", response_model=List[AuditLogResponse])
# async def get_user_audit_logs(
#     user_id: str,
#     current_user: User = Depends(require_admin),
#     db: AsyncSession = Depends(get_db)
# ):
#     """Get audit logs for a specific user (admin only)"""
#     try:
#         stmt = select(AuditLog).where(
#             AuditLog.user_id == user_id
#         ).order_by(AuditLog.timestamp.desc()).limit(100)
        
#         result = await db.execute(stmt)
#         audit_logs = result.scalars().all()
        
#         return audit_logs
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail="Failed to fetch user audit logs"
#         )

# @router.get("/export/{format}")
# async def export_audit_logs(
#     format: str,
#     current_user: User = Depends(require_admin),
#     db: AsyncSession = Depends(get_db)
# ):
#     """Export audit logs to CSV or PDF (admin only)"""
#     if format not in ["csv", "pdf"]:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Export format must be csv or pdf"
#         )
    
#     try:
#         # Get audit logs with user information
#         stmt = select(AuditLog).options(selectinload(AuditLog.user)).order_by(
#             AuditLog.timestamp.desc()
#         ).limit(1000)
        
#         result = await db.execute(stmt)
#         audit_logs = result.scalars().all()
        
#         if format == "csv":
#             # Generate CSV
#             output = io.StringIO()
#             writer = csv.writer(output)
            
#             # Write headers
#             writer.writerow([
#                 "Timestamp", "User", "Action", "Entity Type", 
#                 "Entity ID", "Details", "IP Address"
#             ])
            
#             # Write data rows
#             for log in audit_logs:
#                 user_name = "Unknown"
#                 if log.user:
#                     user_name = f"{log.user.first_name or ''} {log.user.last_name or ''} ({log.user.username})".strip()
                
#                 writer.writerow([
#                     log.timestamp.isoformat(),
#                     user_name,
#                     log.action,
#                     log.entity_type,
#                     log.entity_id or "",
#                     log.details or "",
#                     log.ip_address or ""
#                 ])
            
#             # Create response
#             output.seek(0)
#             filename = f"audit_logs_{datetime.now().strftime('%Y-%m-%d')}.csv"
            
#             return StreamingResponse(
#                 io.BytesIO(output.getvalue().encode('utf-8')),
#                 media_type="text/csv",
#                 headers={"Content-Disposition": f"attachment; filename={filename}"}
#             )
#         else:
#             # PDF generation placeholder
#             return {"message": "PDF generation would happen here"}
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail="Failed to export audit logs"
#         )

# @router.post("/", response_model=AuditLogResponse, status_code=status.HTTP_201_CREATED)
# async def create_audit_log(
#     audit_data: dict,
#     current_user: User = Depends(require_admin),
#     db: AsyncSession = Depends(get_db)
# ):
#     """Create a new audit log entry (admin only)"""
#     try:
#         new_audit_log = AuditLog(
#             id=generate_uuid(),
#             user_id=current_user.id,
#             action=audit_data.get("action"),
#             entity_type=audit_data.get("entityType"),
#             entity_id=audit_data.get("entityId"),
#             details=audit_data.get("details"),
#             ip_address=audit_data.get("ipAddress")
#         )
        
#         db.add(new_audit_log)
#         await db.commit()
#         await db.refresh(new_audit_log)
        
#         return new_audit_log
#     except Exception as e:
#         await db.rollback()
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail="Failed to create audit log entry"
#         )

# backend/app/routers/audit.py

"""
Audit log routes
Converted from Node.js audit.js routes
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
import io
import csv

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.auth_models.audit_log import AuditLog
from app.models.auth_models.user import User
from app.schemas.audit_log import AuditLogResponse
from app.utils.generate_custom_id import generate_uuid

router = APIRouter()

@router.get("/", response_model=List[AuditLogResponse])
async def get_audit_logs(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    action: Optional[str] = Query(None, description="Filter by action"),
    username: Optional[str] = Query(None, description="Filter by username"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all audit logs with filtering options (admin only)"""
    try:
        # Build filter conditions
        conditions = []
        
        if user_id:
            conditions.append(AuditLog.user_id == user_id)
        
        if action:
            conditions.append(AuditLog.action == action)
            
        if username:
            conditions.append(AuditLog.user.has(User.username == username))
        
        if entity_type:
            conditions.append(AuditLog.entity_type == entity_type)
        
        if start_date:
            conditions.append(AuditLog.timestamp >= start_date)
        
        if end_date:
            conditions.append(AuditLog.timestamp <= end_date)
        
        # Build query
        stmt = select(AuditLog).options(selectinload(AuditLog.user))
        
        if conditions:
            stmt = stmt.where(and_(*conditions))
        
        stmt = stmt.order_by(AuditLog.timestamp.desc()).limit(limit).offset(offset)
        
        result = await db.execute(stmt)
        audit_logs = result.scalars().all()
        
        return audit_logs
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch audit logs"
        )

@router.get("/user/{user_id}", response_model=List[AuditLogResponse])
async def get_user_audit_logs(
    user_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get audit logs for a specific user (admin only)"""
    try:
        stmt = select(AuditLog).where(
            AuditLog.user_id == user_id
        ).order_by(AuditLog.timestamp.desc()).limit(100)
        
        result = await db.execute(stmt)
        audit_logs = result.scalars().all()
        
        return audit_logs
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user audit logs"
        )

@router.get("/export/{format}")
async def export_audit_logs(
    format: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Export audit logs to CSV or PDF (admin only)"""
    if format not in ["csv", "pdf"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Export format must be csv or pdf"
        )
    
    try:
        # Get audit logs with user information
        stmt = select(AuditLog).options(selectinload(AuditLog.user)).order_by(
            AuditLog.timestamp.desc()
        ).limit(1000)
        
        result = await db.execute(stmt)
        audit_logs = result.scalars().all()
        
        if format == "csv":
            # Generate CSV
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write headers
            writer.writerow([
                "Timestamp", "User", "Action", "Entity Type", 
                "Entity ID", "Details", "IP Address", "Status", 
                "Event Category", "User Agent", "Role", "Old Values", 
                "New Values"
            ])
            
            # Write data rows
            for log in audit_logs:
                user_name = "Unknown"
                if log.user:
                    user_name = f"{log.user.first_name or ''} {log.user.last_name or ''} ({log.user.username})".strip()
                
                writer.writerow([
                    log.timestamp.isoformat(),
                    user_name,
                    log.action,
                    log.entity_type,
                    log.entity_id or "",
                    log.details or "",
                    log.ip_address or "",
                    log.status or "",
                    log.event_category or "",
                    log.user_agent or "",
                    log.role or "",
                    log.old_values or "",
                    log.new_values or ""
                ])
            
            # Create response
            output.seek(0)
            filename = f"audit_logs_{datetime.now().strftime('%Y-%m-%d')}.csv"
            
            return StreamingResponse(
                io.BytesIO(output.getvalue().encode('utf-8')),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
        else:
            # PDF generation placeholder
            return {"message": "PDF generation would happen here"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export audit logs"
        )

@router.post("/", response_model=AuditLogResponse, status_code=status.HTTP_201_CREATED)
async def create_audit_log(
    audit_data: dict,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new audit log entry (admin only)"""
    try:
        new_audit_log = AuditLog(
            id=generate_uuid(),
            user_id=current_user.id,
            action=audit_data.get("action"),
            entity_type=audit_data.get("entity_type"),  # was entityType
            entity_id=audit_data.get("entity_id"),      # was entityId
            details=audit_data.get("details"),
            status=audit_data.get("status"),            # added status
            event_category=audit_data.get("event_category"),  # added event_category
            ip_address=audit_data.get("ip_address"),    # added ip_address
            user_agent=audit_data.get("user_agent"),    # added user_agent
            role=audit_data.get("role"),                # added role
            old_values=audit_data.get("old_values"),    # added old_values
            new_values=audit_data.get("new_values")     # added new_values
        )
        
        db.add(new_audit_log)
        await db.commit()
        await db.refresh(new_audit_log)
        
        return new_audit_log
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create audit log entry"
        )
