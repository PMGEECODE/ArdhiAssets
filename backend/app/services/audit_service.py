import os
import hmac
import hashlib
import json
import logging
from typing import Optional, Dict, Any, Set, Union
from uuid import UUID

from ipaddress import ip_address, ip_network, IPv4Network, IPv6Network
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request

from app.models.auth_models.audit_log import AuditLog
from app.models.auth_models.user import User
from app.utils.generate_custom_id import generate_uuid

# --------------------------------------------------------------------------- #
# Logging
# --------------------------------------------------------------------------- #
logger = logging.getLogger(__name__)
siem_logger = logging.getLogger("audit_siem")  # Route to Splunk/ELK/SIEM

# --------------------------------------------------------------------------- #
# Helper – trusted proxy loading
# --------------------------------------------------------------------------- #
def _load_trusted_proxies() -> Set[Union[IPv4Network, IPv6Network]]:
    env = os.getenv("TRUSTED_PROXIES", "127.0.0.1/32")
    networks: Set[Union[IPv4Network, IPv6Network]] = set()

    for cidr in (c.strip() for c in env.split(",") if c.strip()):
        try:
            networks.add(ip_network(cidr, strict=False))  # type: ignore[arg-type]
        except ValueError as e:
            logger.warning(f"Invalid CIDR in TRUSTED_PROXIES: {cidr} — {e}")

    localhost = ip_network("127.0.0.1/32")
    networks.add(localhost)  # type: ignore[arg-type]
    return networks

# --------------------------------------------------------------------------- #
# Helper – HMAC signature
# --------------------------------------------------------------------------- #
def _sign_audit_record(record: Dict[str, Any]) -> str:
    key = os.getenv("AUDIT_HMAC_KEY", "").encode()
    if not key:
        return ""

    payload = json.dumps(record, sort_keys=True, separators=(",", ":")).encode()
    return hmac.new(key, payload, hashlib.sha256).hexdigest()

# --------------------------------------------------------------------------- #
# AuditService
# --------------------------------------------------------------------------- #
class AuditService:
    """Singleton service for creating and logging audit events."""

    @staticmethod
    async def create_audit_log(
        db: AsyncSession,
        user: Optional[User],
        action: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        details: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        role: Optional[str] = None,
        status: str = "success",
        event_category: Optional[str] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None,
    ) -> AuditLog:
        # Determine IP & user-agent
        ip = ip_address or (AuditService.get_client_ip(request) if request else "0.0.0.0")
        ua = user_agent or (AuditService.get_user_agent(request) if request else "unknown")

        # Build audit log object
        audit_log = AuditLog(
            id=generate_uuid(),
            user_id=getattr(user, "id", None),
            username=getattr(user, "username", None),
            action=action.upper(),
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            ip_address=ip,
            user_agent=ua,
            role=role or getattr(user, "role", None),
            status=status,
            event_category=event_category or AuditService._infer_category(action),
            old_values=old_values,
            new_values=new_values,
        )

        # ------------------------------------------------------------------- #
        # 1. Persist to DB
        # ------------------------------------------------------------------- #
        try:
            db.add(audit_log)
            await db.commit()
            await db.refresh(audit_log)
        except Exception as e:
            logger.error(f"Audit log creation failed: {e}", exc_info=True)
            await db.rollback()
            raise

        # ------------------------------------------------------------------- #
        # 2. Build SIEM payload (UUID → str, include timestamp)
        # ------------------------------------------------------------------- #
        timestamp = audit_log.timestamp.isoformat() if audit_log.timestamp else None

        payload = {
            "id": str(audit_log.id),
            "user_id": str(audit_log.user_id) if audit_log.user_id else None,
            "username": audit_log.username,
            "action": audit_log.action,
            "entity_type": audit_log.entity_type,
            "entity_id": str(audit_log.entity_id) if audit_log.entity_id else None,
            "details": audit_log.details,
            "ip_address": audit_log.ip_address,
            "user_agent": audit_log.user_agent,
            "role": audit_log.role,
            "status": audit_log.status,
            "event_category": audit_log.event_category,
            "old_values": audit_log.old_values,
            "new_values": audit_log.new_values,
            "timestamp": timestamp,
        }

        # Add digital signature
        payload["signature"] = _sign_audit_record(payload)

        # ------------------------------------------------------------------- #
        # 3. Persist signature to DB (tamper-proof)
        # ------------------------------------------------------------------- #
        audit_log.signature = payload["signature"]
        try:
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to save audit signature: {e}", exc_info=True)
            await db.rollback()
            # Continue — signature is best-effort

        # ------------------------------------------------------------------- #
        # 4. SIEM Export (JSON line)
        # ------------------------------------------------------------------- #
        siem_logger.info(json.dumps(payload, sort_keys=True, separators=(",", ":")))

        # ------------------------------------------------------------------- #
        # 5. Human-readable log
        # ------------------------------------------------------------------- #
        AuditService._log_event(audit_log, user)
        return audit_log

    # ------------------------------------------------------------------- #
    @staticmethod
    def _log_event(audit_log: AuditLog, user: Optional[User]) -> None:
        user_id = getattr(user, "id", "SYSTEM")
        username = getattr(user, "username", "system")
        logger.info(
            "[AUDIT] %s | %s:%s | user=%s (%s) | ip=%s | status=%s",
            audit_log.action,
            audit_log.entity_type or "none",
            audit_log.entity_id or "none",
            username,
            user_id,
            audit_log.ip_address or "unknown",
            audit_log.status,
        )

    # ------------------------------------------------------------------- #
    @staticmethod
    def _infer_category(action: str) -> str:
        categories = {
            "LOGIN": "authentication",
            "LOGOUT": "authentication",
            "PASSWORD_RESET": "authentication",
            "CREATE": "data_modification",
            "UPDATE": "data_modification",
            "DELETE": "data_modification",
            "READ": "data_access",
            "DOWNLOAD": "file_operation",
            "UPLOAD": "file_operation",
            "ROLE_CHANGE": "access_control",
            "PERMISSION_CHANGE": "access_control",
        }
        return categories.get(action.upper(), "system")

    # ------------------------------------------------------------------- #
    @staticmethod
    def get_client_ip(request: Request) -> str:
        if not request or not request.client:
            return "unknown"

        client_host = request.client.host
        trusted_proxies = _load_trusted_proxies()

        def is_trusted(ip: str) -> bool:
            try:
                return ip_address(ip) in trusted_proxies
            except ValueError:
                return False

        def valid_ip(ip: str) -> bool:
            try:
                ip_address(ip)
                return True
            except ValueError:
                return False

        xff = request.headers.get("X-Forwarded-For")
        if xff and is_trusted(client_host):
            candidate = xff.split(",", 1)[0].strip()
            if valid_ip(candidate):
                return candidate

        x_real = request.headers.get("X-Real-IP")
        if x_real and is_trusted(client_host):
            candidate = x_real.strip()
            if valid_ip(candidate):
                return candidate

        return client_host if valid_ip(client_host) else "unknown"

    # ------------------------------------------------------------------- #
    @staticmethod
    def get_user_agent(request: Request) -> str:
        return request.headers.get("User-Agent", "unknown") if request else "unknown"

# --------------------------------------------------------------------------- #
# Public singleton instance
# --------------------------------------------------------------------------- #
audit_service = AuditService()
