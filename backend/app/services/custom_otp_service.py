"""
Custom OTP Service
Implements the custom OTP algorithm using timestamp, deviceId, and instituteSalt
"""

import hmac
import hashlib
import time
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple
from cryptography.fernet import Fernet
import base64

from app.core.config import settings


class CustomOTPService:
    def __init__(self):
        self.institute_salt = settings.INSTITUTE_SALT
        self.encryption_key = settings.ENCRYPTION_KEY
        if isinstance(self.encryption_key, str):
            # If it's a string, encode it and pad/truncate to 32 bytes, then base64 encode
            key_bytes = self.encryption_key.encode()[:32].ljust(32, b'0')
            self.fernet = Fernet(base64.urlsafe_b64encode(key_bytes))
        else:
            self.fernet = Fernet(self.encryption_key.get_secret_value())

    
    def generate_secret(self) -> str:
        """Generate a random secret for a device"""
        return secrets.token_urlsafe(32)
    
    def encrypt_secret(self, secret: str) -> str:
        """Encrypt the secret for storage"""
        return self.fernet.encrypt(secret.encode()).decode()
    
    def decrypt_secret(self, encrypted_secret: str) -> str:
        """Decrypt the secret from storage"""
        return self.fernet.decrypt(encrypted_secret.encode()).decode()
    
    def generate_otp(self, device_id: str, encrypted_secret: str, timestamp: Optional[int] = None) -> str:
        """
        Generate a 6-digit OTP code using custom algorithm
        
        Args:
            device_id: Unique device identifier
            encrypted_secret: Encrypted device secret
            timestamp: Unix timestamp (defaults to current time)
        
        Returns:
            6-digit OTP code as string
        """
        if timestamp is None:
            timestamp = int(time.time())
        
        # Round timestamp to 30-second intervals
        time_step = timestamp // 30
        
        # Decrypt the secret
        secret = self.decrypt_secret(encrypted_secret)
        
        # Create the message to hash: timestamp + deviceId + secret + instituteSalt
        message = f"{time_step}{device_id}{secret}{self.institute_salt}"
        
        # Generate HMAC-SHA256
        hmac_hash = hmac.new(
            self.institute_salt.encode(),
            message.encode(),
            hashlib.sha256
        ).digest()
        
        # Extract 6-digit code from hash
        offset = hmac_hash[-1] & 0x0f
        code = (
            (hmac_hash[offset] & 0x7f) << 24 |
            (hmac_hash[offset + 1] & 0xff) << 16 |
            (hmac_hash[offset + 2] & 0xff) << 8 |
            (hmac_hash[offset + 3] & 0xff)
        ) % 1000000
        
        return f"{code:06d}"
    
    def verify_otp(self, device_id: str, encrypted_secret: str, provided_code: str, 
                   window: int = 1) -> bool:
        """
        Verify an OTP code with time window tolerance
        
        Args:
            device_id: Unique device identifier
            encrypted_secret: Encrypted device secret
            provided_code: The OTP code to verify
            window: Number of 30-second windows to check (default: 1)
        
        Returns:
            True if code is valid, False otherwise
        """
        current_time = int(time.time())
        
        # Check current time and previous/next windows
        for i in range(-window, window + 1):
            test_time = current_time + (i * 30)
            expected_code = self.generate_otp(device_id, encrypted_secret, test_time)
            
            if hmac.compare_digest(expected_code, provided_code):
                return True
        
        return False
    
    def generate_qr_data(self, user_email: str, device_id: str, encrypted_secret: str) -> dict:
        """
        Generate data for QR code enrollment
        
        Args:
            user_email: User's email address
            device_id: Unique device identifier
            encrypted_secret: Encrypted device secret
        
        Returns:
            Dictionary with QR code data
        """
        # For custom OTP, we'll create a custom URI format
        secret = self.decrypt_secret(encrypted_secret)
        
        # Custom URI format for our OTP system
        uri = f"otpauth://totp/{user_email}?secret={base64.b32encode(secret.encode()).decode()}&issuer=AssetManagement&algorithm=SHA256&digits=6&period=30"
        
        return {
            "uri": uri,
            "secret": secret,
            "device_id": device_id,
            "algorithm": "Custom HMAC-SHA256",
            "digits": 6,
            "period": 30
        }


# Global instance
custom_otp_service = CustomOTPService()
