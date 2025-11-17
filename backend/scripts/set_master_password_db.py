"""
Script to set master password in database
Run this script to initialize or update the master password
"""

import asyncio
import sys
import getpass
from pathlib import Path

# --- Load environment variables automatically ---
from dotenv import load_dotenv

# Locate the .env file (one level up from this script)
BASE_DIR = Path(__file__).parent.parent
ENV_PATH = BASE_DIR / ".env"

if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
    print(f"✅ Loaded environment variables from {ENV_PATH}")
else:
    print("⚠️  No .env file found — make sure required environment variables are set manually.")

# --- Add parent directory to import path ---
sys.path.insert(0, str(BASE_DIR))

# --- Now safe to import FastAPI app modules ---
from app.core.database import AsyncSessionLocal
from app.services.system_settings_service import SystemSettingsService


async def set_master_password():
    """Set or update the master password in database"""
    print("=" * 60)
    print("Master Password Setup")
    print("=" * 60)
    print()
    
    # Get password from user
    while True:
        password = getpass.getpass("Enter new master password (min 12 characters): ")
        if len(password) < 12:
            print("❌ Password must be at least 12 characters long")
            continue
        
        confirm = getpass.getpass("Confirm master password: ")
        if password != confirm:
            print("❌ Passwords do not match")
            continue
        
        break
    
    # Get admin username for audit
    updated_by = input("Enter your admin username (optional): ").strip() or None
    
    print()
    print("Setting master password in database...")
    
    async with AsyncSessionLocal() as db:
        try:
            await SystemSettingsService.set_master_password(
                db=db,
                password=password,
                updated_by=updated_by
            )
            print()
            print("✅ Master password has been set successfully!")
            print()
            print("The password is now stored securely in the database.")
            print("Users will need to enter this password to access System Backups.")
            print()
        except Exception as e:
            print()
            print(f"❌ Error setting master password: {e}")
            print()
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(set_master_password())
