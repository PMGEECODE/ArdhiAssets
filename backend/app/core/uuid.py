# app/core/uuid.py
from uuid import uuid4, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID as PGUUID

def UUIDColumn() -> Mapped[UUID]:
    return mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid4
    )
