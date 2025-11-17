"""
Set Master Password in Isolated Database
Interactive script to set or update the master password
"""

import asyncio
import sys
import getpass
from pathlib import Path

from dotenv import load_dotenv
BASE_DIR = Path(__file__).parent.parent
ENV_PATH = BASE_DIR / ".env"

if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)

sys.path.insert(0, str(BASE_DIR))

from app.core.isolated_db import IsolatedAsyncSessionLocal
from app.services.isolated_master_password_service import IsolatedMasterPasswordService


async def set_master_password():
    """Interactive master password setup"""
    print("=" * 70)
    print("Set Master Password (Isolated Database)")
    print("=" * 70)
    print()
    
    # Get password from user
    while True:
        password = getpass.getpass(
            "Enter new master password (minimum 12 characters): "
        )
        
        if len(password) < 12:
            print("✗ Password must be at least 12 characters")
            continue
        
        if not any(c.isupper() for c in password):
            print("✗ Password must contain at least one uppercase letter")
            continue
        
        if not any(c.islower() for c in password):
            print("✗ Password must contain at least one lowercase letter")
            continue
        
        if not any(c.isdigit() for c in password):
            print("✗ Password must contain at least one digit")
            continue
        
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            print("✗ Password must contain at least one special character")
            continue
        
        confirm = getpass.getpass("Confirm master password: ")
        if password != confirm:
            print("✗ Passwords do not match")
            continue
        
        break
    
    # Get admin username
    admin_username = input("Enter your admin username (for audit logging): ").strip()
    
    print()
    print("Setting master password in isolated database...")
    print()
    
    try:
        async with IsolatedAsyncSessionLocal() as db:
            result = await IsolatedMasterPasswordService.set_master_password(
                db=db,
                password=password,
                updated_by_username=admin_username or "admin",
                label="Initial master password",
            )
            
            if result:
                print(f"✓ Master password set successfully!")
                print(f"  Version: {result.version}")
                print(f"  ID: {result.id}")
                print()
                print("The master password is now active and ready for use.")
                print()
            else:
                print("✗ Failed to set master password")
                sys.exit(1)
    
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(set_master_password())
