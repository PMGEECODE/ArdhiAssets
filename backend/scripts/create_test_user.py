import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.auth_models.user import User
from app.models.role import Role
from app.core.security import hash_password


async def create_test_user():
    async with AsyncSessionLocal() as db:
        query = select(Role).where(Role.name == "user")
        result = await db.execute(query)
        user_role = result.scalar_one_or_none()

        if not user_role:
            print("Error: 'user' role not found. Run migrations first.")
            return

        existing_query = select(User).where(User.username == "testuser")
        existing_result = await db.execute(existing_query)
        existing_user = existing_result.scalar_one_or_none()

        if existing_user:
            print("Test user 'testuser' already exists")
            return

        password_hash = hash_password("TestPassword123!")

        test_user = User(
            email="test@example.com",
            username="testuser",
            password_hash=password_hash,
            is_active=True,
            is_verified=True,
            role_id=user_role.id
        )

        db.add(test_user)
        await db.commit()

        print("✓ Test user created successfully!")
        print("  Username: testuser")
        print("  Password: TestPassword123!")
        print("  Email: test@example.com")

        admin_query = select(Role).where(Role.name == "admin")
        admin_result = await db.execute(admin_query)
        admin_role = admin_result.scalar_one_or_none()

        if not admin_role:
            print("Error: 'admin' role not found")
            return

        existing_admin_query = select(User).where(User.username == "admin")
        existing_admin_result = await db.execute(existing_admin_query)
        existing_admin = existing_admin_result.scalar_one_or_none()

        if not existing_admin:
            admin_password_hash = hash_password("AdminPassword123!")

            admin_user = User(
                email="admin@example.com",
                username="admin",
                password_hash=admin_password_hash,
                is_active=True,
                is_verified=True,
                role_id=admin_role.id
            )

            db.add(admin_user)
            await db.commit()

            print("\n✓ Admin user created successfully!")
            print("  Username: admin")
            print("  Password: AdminPassword123!")
            print("  Email: admin@example.com")
        else:
            print("\nAdmin user 'admin' already exists")


if __name__ == "__main__":
    asyncio.run(create_test_user())
