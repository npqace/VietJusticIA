"""
Script to seed the database with mock lawyer data for testing.
Run with: docker-compose exec backend python scripts/seed_lawyers.py
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.database.database import SessionLocal
from app.database.models import User, Lawyer
from passlib.context import CryptContext
from decimal import Decimal

# Password hasher
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def seed_lawyers():
    """Seed database with mock lawyer data."""
    db = SessionLocal()

    try:
        print("Starting lawyer data seeding...")

        # Mock lawyer data
        lawyers_data = [
            {
                "user": {
                    "full_name": "Luật sư Nguyễn Văn An",
                    "email": "ls.nguyenvanan@lawfirm.vn",
                    "phone": "0901234567",
                    "hashed_password": hash_password("Password123!"),
                    "is_active": True,
                    "is_verified": True,
                    "role": User.Role.LAWYER,
                },
                "lawyer": {
                    "specialization": "Luật Dân sự, Luật Gia đình",
                    "bio": "Hơn 15 năm kinh nghiệm trong lĩnh vực luật dân sự và gia đình. Tốt nghiệp Thạc sĩ Luật tại Đại học Luật Hà Nội. Đã giải quyết thành công hơn 500 vụ án liên quan đến tranh chấp hợp đồng, ly hôn, phân chia tài sản.",
                    "years_of_experience": 15,
                    "bar_license_number": "LS-HN-001234",
                    "city": "Hà Nội",
                    "province": "Hà Nội",
                    "rating": Decimal("4.8"),
                    "total_reviews": 127,
                    "consultation_fee": Decimal("500000"),
                    "languages": "Tiếng Việt, English",
                    "verification_status": Lawyer.VerificationStatus.APPROVED,
                    "is_available": True
                }
            },
            {
                "user": {
                    "full_name": "Luật sư Trần Thị Bình",
                    "email": "ls.tranthibinh@lawfirm.vn",
                    "phone": "0902345678",
                    "hashed_password": hash_password("Password123!"),
                    "is_active": True,
                    "is_verified": True,
                    "role": User.Role.LAWYER,
                },
                "lawyer": {
                    "specialization": "Luật Lao động, Luật Bảo hiểm xã hội",
                    "bio": "Chuyên gia tư vấn về quyền lợi người lao động. 12 năm kinh nghiệm giải quyết các tranh chấp lao động, sa thải trái luật, bảo hiểm xã hội. Từng làm việc tại Sở Lao động Thương binh và Xã hội TP.HCM.",
                    "years_of_experience": 12,
                    "bar_license_number": "LS-HCM-005678",
                    "city": "TP. Hồ Chí Minh",
                    "province": "TP. Hồ Chí Minh",
                    "rating": Decimal("4.9"),
                    "total_reviews": 203,
                    "consultation_fee": Decimal("600000"),
                    "languages": "Tiếng Việt",
                    "verification_status": Lawyer.VerificationStatus.APPROVED,
                    "is_available": True
                }
            },
            {
                "user": {
                    "full_name": "Luật sư Lê Minh Cường",
                    "email": "ls.leminhcuong@lawfirm.vn",
                    "phone": "0903456789",
                    "hashed_password": hash_password("Password123!"),
                    "is_active": True,
                    "is_verified": True,
                    "role": User.Role.LAWYER,
                },
                "lawyer": {
                    "specialization": "Luật Hình sự, Luật Tố tụng hình sự",
                    "bio": "Chuyên bào chữa các vụ án hình sự. 10 năm kinh nghiệm làm việc tại Viện Kiểm sát và sau đó chuyển sang hành nghề luật sư. Thành thạo trong việc phân tích hồ sơ vụ án, xây dựng chiến lược bào chữa hiệu quả.",
                    "years_of_experience": 10,
                    "bar_license_number": "LS-DN-009012",
                    "city": "Đà Nẵng",
                    "province": "Đà Nẵng",
                    "rating": Decimal("4.7"),
                    "total_reviews": 89,
                    "consultation_fee": Decimal("700000"),
                    "languages": "Tiếng Việt, English",
                    "verification_status": Lawyer.VerificationStatus.APPROVED,
                    "is_available": True
                }
            },
            {
                "user": {
                    "full_name": "Luật sư Phạm Thị Dung",
                    "email": "ls.phamthidung@lawfirm.vn",
                    "phone": "0904567890",
                    "hashed_password": hash_password("Password123!"),
                    "is_active": True,
                    "is_verified": True,
                    "role": User.Role.LAWYER,
                },
                "lawyer": {
                    "specialization": "Luật Doanh nghiệp, Luật Đầu tư",
                    "bio": "Tư vấn pháp lý cho doanh nghiệp vừa và nhỏ. 8 năm kinh nghiệm trong việc thành lập công ty, soạn thảo hợp đồng kinh tế, tư vấn đầu tư. Từng làm việc cho các công ty luật quốc tế.",
                    "years_of_experience": 8,
                    "bar_license_number": "LS-HN-012345",
                    "city": "Hà Nội",
                    "province": "Hà Nội",
                    "rating": Decimal("4.6"),
                    "total_reviews": 64,
                    "consultation_fee": Decimal("800000"),
                    "languages": "Tiếng Việt, English, 日本語",
                    "verification_status": Lawyer.VerificationStatus.APPROVED,
                    "is_available": True
                }
            },
            {
                "user": {
                    "full_name": "Luật sư Hoàng Văn Em",
                    "email": "ls.hoangvanem@lawfirm.vn",
                    "phone": "0905678901",
                    "hashed_password": hash_password("Password123!"),
                    "is_active": True,
                    "is_verified": True,
                    "role": User.Role.LAWYER,
                },
                "lawyer": {
                    "specialization": "Luật Đất đai, Luật Nhà ở",
                    "bio": "Chuyên gia về các vấn đề tranh chấp đất đai, nhà ở. 13 năm kinh nghiệm giải quyết các tranh chấp về quyền sử dụng đất, mua bán nhà đất, bồi thường giải phóng mặt bằng.",
                    "years_of_experience": 13,
                    "bar_license_number": "LS-HP-003456",
                    "city": "Hải Phòng",
                    "province": "Hải Phòng",
                    "rating": Decimal("4.5"),
                    "total_reviews": 72,
                    "consultation_fee": Decimal("550000"),
                    "languages": "Tiếng Việt",
                    "verification_status": Lawyer.VerificationStatus.APPROVED,
                    "is_available": False  # Currently not available
                }
            },
            {
                "user": {
                    "full_name": "Luật sư Vũ Thị Phương",
                    "email": "ls.vuthiphuong@lawfirm.vn",
                    "phone": "0906789012",
                    "hashed_password": hash_password("Password123!"),
                    "is_active": True,
                    "is_verified": True,
                    "role": User.Role.LAWYER,
                },
                "lawyer": {
                    "specialization": "Luật Tri thức, Luật Công nghệ",
                    "bio": "Chuyên về bảo hộ quyền sở hữu trí tuệ, nhãn hiệu, bản quyền. 6 năm kinh nghiệm tư vấn cho các công ty công nghệ và startup. Thạc sĩ Luật Quốc tế tại Úc.",
                    "years_of_experience": 6,
                    "bar_license_number": "LS-HCM-006789",
                    "city": "TP. Hồ Chí Minh",
                    "province": "TP. Hồ Chí Minh",
                    "rating": Decimal("4.9"),
                    "total_reviews": 45,
                    "consultation_fee": Decimal("900000"),
                    "languages": "Tiếng Việt, English",
                    "verification_status": Lawyer.VerificationStatus.APPROVED,
                    "is_available": True
                }
            },
        ]

        # Create users and lawyers
        created_count = 0
        for data in lawyers_data:
            # Check if user already exists
            existing_user = db.query(User).filter(User.email == data["user"]["email"]).first()
            if existing_user:
                print(f"User {data['user']['email']} already exists, skipping...")
                continue

            # Create user
            user = User(**data["user"])
            db.add(user)
            db.flush()  # Flush to get user.id

            # Create lawyer profile
            lawyer_data = data["lawyer"].copy()
            lawyer_data["user_id"] = user.id
            lawyer = Lawyer(**lawyer_data)
            db.add(lawyer)

            created_count += 1
            print(f"Created lawyer: {user.full_name}")

        db.commit()
        print(f"\nSeeding completed! Created {created_count} new lawyers.")
        print("Default password for all lawyers: Password123!")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_lawyers()
