"""
Script to create admin user
"""

import asyncio
import sys
from app.core.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.utils.generate_custom_id import generate_uuid

async def create_admin_user():
    """Create admin user interactively"""
    try:
        async with AsyncSessionLocal() as db:
            print("Creating admin user...")
            
            username = input("Enter admin username: ").strip()
            email = input("Enter admin email: ").strip()
            password = input("Enter admin password: ").strip()
            first_name = input("Enter first name: ").strip()
            last_name = input("Enter last name: ").strip()
            
            if not all([username, email, password]):
                print("❌ Username, email, and password are required")
                sys.exit(1)
            
            # Create admin user
            admin_user = User(
                id=generate_uuid(),
                username=username,
                email=email,
                firstName=first_name or "Admin",
                lastName=last_name or "User",
                role=UserRole.ADMIN,
                isActive=True
            )
            
            admin_user.set_password(password)
            
            db.add(admin_user)
            await db.commit()
            
            print(f"✅ Admin user created successfully: {email}")
            
    except Exception as e:
        print(f"❌ Failed to create admin user: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(create_admin_user())
