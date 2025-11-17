"""
Initialize default roles, permissions, and admin user on startup
"""

import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.models.auth_models.role import Role, Permission, RolePermission
from app.models.auth_models.user import User, UserRole
from app.utils.generate_custom_id import generate_uuid
from app.core.config import settings

logger = logging.getLogger(__name__)


async def init_default_roles_and_permissions(session: AsyncSession) -> None:
    """Initialize default roles and permissions"""
    
    try:
        # Check if roles already exist
        stmt = select(Role).where(Role.name == "ADMIN")
        result = await session.execute(stmt)
        if result.scalar_one_or_none():
            logger.info("Default roles already exist, skipping initialization")
            return
        
        # Define default permissions
        permissions_data = [
            ("users.create", "Create users"),
            ("users.read", "Read users"),
            ("users.update", "Update users"),
            ("users.delete", "Delete users"),
            ("assets.create", "Create assets"),
            ("assets.read", "Read assets"),
            ("assets.update", "Update assets"),
            ("assets.delete", "Delete assets"),
            ("assets.transfer", "Transfer assets"),
            ("approvals.create", "Create approvals"),
            ("approvals.read", "Read approvals"),
            ("approvals.approve", "Approve requests"),
            ("approvals.reject", "Reject requests"),
            ("reports.read", "Read reports"),
            ("audit.read", "Read audit logs"),
            ("settings.manage", "Manage system settings"),
        ]
        
        # Create permissions
        permissions_map = {}
        for code, description in permissions_data:
            permission = Permission(
                id=generate_uuid(),
                code=code,
                description=description,
                created_at=datetime.utcnow()
            )
            session.add(permission)
            permissions_map[code] = permission
        
        await session.flush()
        
        # Define default roles with their permissions
        roles_data = {
            "ADMIN": {
                "description": "Administrator with full access",
                "permissions": list(permissions_map.keys())  # All permissions
            },
            "MANAGER": {
                "description": "Manager with asset management access",
                "permissions": [
                    "users.read", "assets.create", "assets.read", "assets.update",
                    "assets.transfer", "approvals.read", "approvals.approve",
                    "reports.read", "audit.read"
                ]
            },
            "USER": {
                "description": "Regular user with limited access",
                "permissions": [
                    "assets.read", "approvals.create", "reports.read"
                ]
            },
            "VIEWER": {
                "description": "Viewer with read-only access",
                "permissions": ["assets.read", "reports.read"]
            }
        }
        
        # Create roles and assign permissions
        for role_name, role_info in roles_data.items():
            role = Role(
                id=generate_uuid(),
                name=role_name,
                description=role_info["description"],
                created_at=datetime.utcnow()
            )
            session.add(role)
            await session.flush()
            
            # Assign permissions to role
            for perm_code in role_info["permissions"]:
                if perm_code in permissions_map:
                    role_perm = RolePermission(
                        role_id=role.id,
                        permission_id=permissions_map[perm_code].id
                    )
                    session.add(role_perm)
        
        await session.commit()
        logger.info("✓ Default roles and permissions created successfully")
        
    except Exception as e:
        logger.error(f"✗ Error initializing roles and permissions: {e}", exc_info=True)
        await session.rollback()
        raise


async def init_default_admin_user(session: AsyncSession) -> None:
    """Initialize default admin user"""
    
    try:
        # Check if admin user already exists
        stmt = select(User).where(User.email == settings.DEFAULT_ADMIN_EMAIL)
        result = await session.execute(stmt)
        if result.scalar_one_or_none():
            logger.info("Default admin user already exists, skipping initialization")
            return
        
        # Create default admin user
        admin_user = User(
            id=generate_uuid(),
            email=settings.DEFAULT_ADMIN_EMAIL,
            username=settings.DEFAULT_ADMIN_USERNAME,
            first_name="System",
            last_name="Administrator",
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True,
            created_at=datetime.utcnow()
        )
        
        # Set password
        admin_user.set_password(settings.DEFAULT_ADMIN_PASSWORD)
        
        session.add(admin_user)
        await session.commit()
        await session.refresh(admin_user)
        
        logger.info(f"✓ Default admin user created successfully: {admin_user.email}")
        
    except Exception as e:
        logger.error(f"✗ Error initializing default admin user: {e}", exc_info=True)
        await session.rollback()
        raise


async def init_default_data(session: AsyncSession) -> None:
    """Initialize all default data (roles, permissions, admin user)"""
    try:
        logger.info("Initializing default data...")
        await init_default_roles_and_permissions(session)
        await init_default_admin_user(session)
        logger.info("✓ Default data initialization completed")
    except Exception as e:
        logger.error(f"✗ Error during default data initialization: {e}", exc_info=True)
        raise
