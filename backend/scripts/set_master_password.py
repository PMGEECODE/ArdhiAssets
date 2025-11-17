#!/usr/bin/env python3
"""
Script to generate and set master password hash
Usage: python scripts/set_master_password.py
"""

import sys
import os
from getpass import getpass

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from EMS_SERVER.app.core.security14 import get_password_hash

def main():
    print("=" * 60)
    print("Master Password Setup for System Backups")
    print("=" * 60)
    print()
    print("This will generate a hashed master password for backup access.")
    print("Add the generated hash to your .env file as MASTER_PASSWORD_HASH")
    print()
    
    # Get password from user
    password = getpass("Enter master password: ")
    password_confirm = getpass("Confirm master password: ")
    
    if password != password_confirm:
        print("\n❌ Passwords do not match!")
        sys.exit(1)
    
    if len(password) < 12:
        print("\n❌ Password must be at least 12 characters long!")
        sys.exit(1)
    
    # Generate hash
    password_hash = get_password_hash(password)
    
    print("\n" + "=" * 60)
    print("✅ Master Password Hash Generated Successfully!")
    print("=" * 60)
    print()
    print("Add this line to your .env file:")
    print()
    print(f"MASTER_PASSWORD_HASH={password_hash}")
    print()
    print("⚠️  IMPORTANT: Keep this password secure and do not share it!")
    print("=" * 60)

if __name__ == "__main__":
    main()
