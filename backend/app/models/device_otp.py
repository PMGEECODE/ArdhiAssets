import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class DeviceOTP(Base):
    __tablename__ = "device_otp"
    
    # Use UUIDv4 for primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)

    # Use UUID also for the user foreign key if users.id is UUID
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Device identifier (unique per device, ensures no duplicate registration)
    device_id = Column(String, nullable=False, unique=True, index=True)
    device_name = Column(String, nullable=False)

    # Encrypted OTP secret
    encrypted_secret = Column(Text, nullable=False)

    # Status
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_used = Column(DateTime(timezone=True), nullable=True)

    # Relationship
    user = relationship("User", back_populates="device_otps")

    def __repr__(self):
        return f"<DeviceOTP(device_id='{self.device_id}', user_id='{self.user_id}', active={self.is_active})>"


# ✅ Additional indexes for performance
Index("idx_deviceotp_user_device", DeviceOTP.user_id, DeviceOTP.device_id)
Index("idx_deviceotp_active", DeviceOTP.is_active)
Index("idx_deviceotp_last_used", DeviceOTP.last_used)
Index("idx_deviceotp_created_at", DeviceOTP.created_at)