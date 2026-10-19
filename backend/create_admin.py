import sys
from getpass import getpass

from sqlalchemy import select

from app.database import SessionLocal
from app.models import User, Role
from app.security import hash_password


def main():
    email = input("Admin email: ").strip().lower()
    full_name = input("Full name: ").strip()
    password = getpass("Password (8-72 characters): ")
    confirm = getpass("Confirm password: ")

    if not email or not full_name:
        sys.exit("Email and full name are required.")
    if password != confirm:
        sys.exit("Passwords do not match.")
    if not 8 <= len(password) <= 72:
        sys.exit("Password must be 8-72 characters.")

    db = SessionLocal()
    try:
        if db.scalar(select(User).where(User.email == email)):
            sys.exit("A user with that email already exists.")
        admin = User(
            email=email,
            full_name=full_name,
            hashed_password=hash_password(password),
            role=Role.admin,
        )
        db.add(admin)
        db.commit()
        print(f"Admin created: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
