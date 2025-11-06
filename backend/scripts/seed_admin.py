"""
Script to seed the database with admin user for testing.
Run with: docker-compose exec backend python scripts/seed_admin.py
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.database.database import SessionLocal
from app.database.models import User
from passlib.context import CryptContext

# Password hasher
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def seed_admin():
    """Seed database with admin user."""
    db = SessionLocal()

    try:
        print("Starting admin user seeding...")

        # Admin user data
        admin_data = {
            "full_name": "Administrator",
            "email": "admin@vietjusticia.vn",
            "phone": "0900000000",
            "hashed_password": hash_password("Admin123!"),
            "is_active": True,
            "is_verified": True,
            "role": User.Role.ADMIN,
        }

        # Check if admin already exists
        existing_admin = db.query(User).filter(User.email == admin_data["email"]).first()
        if existing_admin:
            print(f"Admin user {admin_data['email']} already exists.")
            print("If you need to reset the password, delete the user and run this script again.")
            return

        # Create admin user
        admin_user = User(**admin_data)
        db.add(admin_user)
        db.commit()

        print(f"\nAdmin user created successfully!")
        print(f"Email: {admin_data['email']}")
        print(f"Password: Admin123!")
        print("\nYou can now log in to the admin portal with these credentials.")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
