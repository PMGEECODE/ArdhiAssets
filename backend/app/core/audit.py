# app/core/audit.py

from sqlalchemy.ext.asyncio import AsyncSession
from app.models.auth_models.audit_log import AuditLog
from app.utils.generate_custom_id import generate_uuid
from datetime import datetime
from typing import Optional

async def log_audit_event(
    db: AsyncSession,
    user_id: Optional[str],
    username: Optional[str],
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None
):
    """Utility function to log an audit event"""

    # Ensure entity_id is always a string if provided
    if entity_id is not None:
        entity_id = str(entity_id)

    audit_log = AuditLog(
        id=generate_uuid(),
        user_id=user_id,
        username=username,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=ip_address,
        timestamp=datetime.utcnow()
    )

    db.add(audit_log)
    await db.commit()
    await db.refresh(audit_log)
    return audit_log
