# Database Seeding Scripts

This directory contains scripts to populate the database with mock data for development and testing.

## Available Scripts

### 1. `seed_all.py` - Comprehensive Seeding (Recommended)

Seeds all mock data at once: admin, lawyers, and regular users.

```bash
# Using Docker
docker-compose exec backend python scripts/seed_all.py

# Without Docker
cd backend
python scripts/seed_all.py
```

**Creates:**
- 1 Admin account
- 6 Lawyer accounts
- Regular users should sign up through the app (to test OTP/email verification)

---

### 2. `seed_admin.py` - Admin Only

Seeds only the admin user.

```bash
docker-compose exec backend python scripts/seed_admin.py
```

**Admin Credentials:**
- Email: `admin@vietjusticia.vn`
- Password: `Admin123!`

---

### 3. `seed_lawyers.py` - Lawyers Only

Seeds 6 mock lawyer accounts.

```bash
docker-compose exec backend python scripts/seed_lawyers.py
```

**Lawyer Credentials:** (All use password: `Password123!`)
- `ls.nguyenvanan@lawfirm.vn` - Luật Dân sự, Luật Gia đình
- `ls.tranthibinh@lawfirm.vn` - Luật Lao động, Luật Bảo hiểm xã hội
- `ls.leminhcuong@lawfirm.vn` - Luật Hình sự, Luật Tố tụng hình sự
- `ls.phamthidung@lawfirm.vn` - Luật Doanh nghiệp, Luật Đầu tư
- `ls.hoangvanem@lawfirm.vn` - Luật Đất đai, Luật Nhà ở
- `ls.vuthiphuong@lawfirm.vn` - Luật Tri thức, Luật Công nghệ

---

## Complete Test Accounts Reference

### Admin Account
```
Email:    admin@vietjusticia.vn
Password: Admin123!
Role:     admin
```

### Lawyer Accounts (Password: `Password123!`)
```
Email: ls.nguyenvanan@lawfirm.vn
Name:  Luật sư Nguyễn Văn An
Specialization: Luật Dân sự, Luật Gia đình
Experience: 15 years

Email: ls.tranthibinh@lawfirm.vn
Name:  Luật sư Trần Thị Bình
Specialization: Luật Lao động, Luật Bảo hiểm xã hội
Experience: 12 years

Email: ls.leminhcuong@lawfirm.vn
Name:  Luật sư Lê Minh Cường
Specialization: Luật Hình sự, Luật Tố tụng hình sự
Experience: 10 years

Email: ls.phamthidung@lawfirm.vn
Name:  Luật sư Phạm Thị Dung
Specialization: Luật Doanh nghiệp, Luật Đầu tư
Experience: 8 years

Email: ls.hoangvanem@lawfirm.vn
Name:  Luật sư Hoàng Văn Em
Specialization: Luật Đất đai, Luật Nhà ở
Experience: 13 years
Status: NOT AVAILABLE (for testing unavailable state)

Email: ls.vuthiphuong@lawfirm.vn
Name:  Luật sư Vũ Thị Phương
Specialization: Luật Tri thức, Luật Công nghệ
Experience: 6 years
```

### Regular User Accounts
**Not seeded** - Users should sign up through the application to test the OTP verification and email features.

To test the signup flow:
1. Go to the signup page in the mobile app or web portal
2. Enter your real email address (to receive OTP)
3. Verify with the OTP sent to your email
4. Complete the signup process

---

## Usage Tips

1. **First Time Setup**: Run `seed_all.py` to create all test accounts at once
2. **Idempotent**: Scripts check for existing users and skip them (safe to run multiple times)
3. **Reset Password**: Delete the user from database and re-run the script
4. **Production**: NEVER run these scripts in production environment

---

## Testing Scenarios

### Test as Admin
Login with `admin@vietjusticia.vn` to:
- View all users
- Manage lawyer applications
- View system statistics

### Test as Lawyer
Login with any `ls.*@lawfirm.vn` account to:
- View service requests
- Accept/reject consultation requests
- Manage profile

### Test as Regular User
Sign up with your real email to:
- Test OTP verification flow
- Browse lawyers
- Request consultations
- Use AI chat assistant

---

## Troubleshooting

**Script fails with "User already exists"**
- This is normal behavior if accounts were already created
- The script will skip existing users and continue

**Import errors**
- Make sure you're running from the correct directory
- Check that all dependencies are installed: `pip install -r requirements.txt`

**Database connection errors**
- Verify PostgreSQL is running: `docker-compose ps`
- Check DATABASE_URL in your .env file
