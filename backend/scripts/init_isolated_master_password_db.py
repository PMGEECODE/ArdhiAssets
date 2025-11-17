"""
Initialize Isolated Master Password Database
Run this script to set up the isolated database with master password table
"""

import asyncio
import sys
from pathlib import Path

# Load environment
from dotenv import load_dotenv
BASE_DIR = Path(__file__).parent.parent
ENV_PATH = BASE_DIR / ".env"

if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
    print(f"✓ Loaded environment from {ENV_PATH}")

sys.path.insert(0, str(BASE_DIR))

from app.core.isolated_db import init_isolated_db
from app.core.config import settings


async def main():
    """Initialize isolated master password database"""
    print("=" * 70)
    print("Initializing Isolated Master Password Database")
    print("=" * 70)
    print()
    
    print(f"Configuration:")
    print(f"  Environment: {settings.ENV}")
    print(f"  Isolated DB URL: {settings.ISOLATED_MASTER_PASSWORD_DB_URL}")
    print()
    
    if not settings.ISOLATED_MASTER_PASSWORD_DB_URL:
        print("⚠️  ISOLATED_MASTER_PASSWORD_DB_URL not configured!")
        print("    Master password will use main database (development mode)")
        print()
    
    try:
        print("Initializing isolated database...")
        await init_isolated_db()
        print()
        print("✓ Isolated master password database initialized successfully!")
        print()
        print("Next steps:")
        print("  1. Run: python scripts/set_isolated_master_password.py")
        print("  2. This will prompt you to set the master password")
        print()
    except Exception as e:
        print()
        print(f"✗ Failed to initialize isolated database: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
