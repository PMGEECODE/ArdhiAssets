from argon2 import PasswordHasher
from datetime import datetime
import uuid
from sqlalchemy import text
from app.db.session import async_session

async def create_user():
    ph = PasswordHasher()
    hashed = ph.hash("Test@12345")

    async with async_session() as session:
        await session.execute(text("""
            INSERT INTO users (id, email, username, password_hash, is_active, is_verified, created_at)
            VALUES (:id, :email, :username, :password_hash, :is_active, :is_verified, :created_at)
        """), {
            "id": str(uuid.uuid4()),
            "email": "dummygeecode@gmail.com",
            "username": "dummygeecode",
            "password_hash": hashed,
            "is_active": True,
            "is_verified": True,
            "created_at": datetime.utcnow()
        })
        await session.commit()

import asyncio
asyncio.run(create_user())
