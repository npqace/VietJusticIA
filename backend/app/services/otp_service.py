import os
import random
import logging
from datetime import datetime, timedelta, timezone
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from sqlalchemy.orm import Session
from ..database.models import User

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Gmail SMTP Configuration
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
    MAIL_FROM=os.getenv("MAIL_FROM", ""),
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

def generate_otp(length: int = 6) -> str:
    """
    Generates a random OTP of a specified length.
    """
    return "".join([str(random.randint(0, 9)) for _ in range(length)])

def get_otp_expiry_time(minutes: int = 15) -> datetime:
    """
    Returns the expiry time for an OTP.
    """
    return datetime.now(timezone.utc) + timedelta(minutes=minutes)

async def send_verification_otp(db: Session, user: User, email: str = None):
    """
    Generates, saves, and sends an OTP for verification.
    """
    otp = generate_otp()
    user.otp = otp
    user.otp_expires_at = get_otp_expiry_time()
    db.commit()

    target_email = email if email else user.email
    return await send_otp_email(target_email, otp)

async def send_otp_email(email: str, otp: str) -> bool:
    """
    Sends the OTP to the user's email address using Gmail SMTP.
    Returns True on success, False on failure.
    """
    # Vietnamese HTML content
    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #2854A8;">Xác thực tài khoản VietJusticIA</h2>
        <p>Xin chào,</p>
        <p>Cảm ơn bạn đã đăng ký. Vui lòng sử dụng Mã xác thực một lần (OTP) sau đây để xác minh tài khoản của bạn. Mã này sẽ hết hạn trong 15 phút.</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #2854A8; background-color: #f5f5f5; padding: 10px; border-radius: 5px; text-align: center;">{otp}</p>
        <p>Nếu bạn không yêu cầu email này, vui lòng bỏ qua.</p>
        <br>
        <p>Trân trọng,</p>
        <p><strong>Đội ngũ VietJusticIA</strong></p>
    </div>
    """
    return await send_email('Mã xác thực VietJusticIA của bạn', email, html_content)


async def send_password_reset_otp(db: Session, user: User) -> bool:
    """
    Generates, saves, and sends an OTP for password reset.
    """
    otp = generate_otp()
    # Note: In a real implementation, you should hash the OTP before saving
    user.reset_password_otp = otp
    user.reset_password_otp_expires_at = get_otp_expiry_time(minutes=10) # Shorter expiry for security
    db.commit()

    # Vietnamese HTML content for password reset
    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #2854A8;">Yêu cầu đặt lại mật khẩu VietJusticIA</h2>
        <p>Xin chào,</p>
        <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã OTP sau để hoàn tất quá trình. Mã này sẽ hết hạn trong 10 phút.</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #2854A8; background-color: #f5f5f5; padding: 10px; border-radius: 5px; text-align: center;">{otp}</p>
        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        <br>
        <p>Trân trọng,</p>
        <p><strong>Đội ngũ VietJusticIA</strong></p>
    </div>
    """
    return await send_email('Mã OTP đặt lại mật khẩu VietJusticIA của bạn', user.email, html_content)



async def send_email(subject: str, recipient: str, html_content: str) -> bool:
    """
    Sends an email with the given subject and HTML content to the recipient using Gmail SMTP.
    """
    mail_from = os.getenv("MAIL_FROM")

    if not mail_from:
        logger.error("MAIL_FROM not configured in environment.")
        return False

    message = MessageSchema(
        subject=subject,
        recipients=[recipient],
        body=html_content,
        subtype="html"
    )

    try:
        fm = FastMail(conf)
        await fm.send_message(message)
        logger.info(f"Email '{subject}' successfully sent to {recipient}")
        return True
    except Exception as e:
        logger.error(f"An exception occurred while sending email to {recipient}: {e}")
        return False
