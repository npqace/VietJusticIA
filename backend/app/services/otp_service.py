import os
import random
import logging
from datetime import datetime, timedelta, timezone
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from sqlalchemy.orm import Session
from ..database.models import User

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    Sends the OTP to the user's email address using SendGrid.
    Returns True on success, False on failure.
    """
    sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
    sender_email = os.getenv("SENDER_EMAIL")

    if not sendgrid_api_key or not sender_email:
        logger.error("SENDGRID_API_KEY or SENDER_EMAIL not configured in environment.")
        return False

    # Vietnamese HTML content
    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style=\"color: #2854A8;\">Xác thực tài khoản VietJusticIA</h2>
        <p>Xin chào,</p>
        <p>Cảm ơn bạn đã đăng ký. Vui lòng sử dụng Mã xác thực một lần (OTP) sau đây để xác minh tài khoản của bạn. Mã này sẽ hết hạn trong 15 phút.</p>
        <p style=\"font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #2854A8; background-color: #f5f5f5; padding: 10px; border-radius: 5px; text-align: center;\">{otp}</p>
        <p>Nếu bạn không yêu cầu email này, vui lòng bỏ qua.</p>
        <br>
        <p>Trân trọng,</p>
        <p><strong>Đội ngũ VietJusticIA</strong></p>
    </div>
    """

    message = Mail(
        from_email=sender_email,
        to_emails=email,
        subject='Mã xác thực VietJusticIA của bạn',
        html_content=html_content
    )

    try:
        sg = SendGridAPIClient(sendgrid_api_key)
        response = await sg.send(message)
        
        if response.status_code == 202:
            logger.info(f"OTP email successfully sent to {email}")
            return True
        else:
            logger.error(f"Failed to send OTP email to {email}. Status: {response.status_code}, Body: {response.body}")
            return False
    except Exception as e:
        logger.error(f"An exception occurred while sending email to {email}: {e}")
        return False